// Push a lead to Meritto (NoPaperForms) and log the outcome.
// Called directly (client/edge/DB trigger). Idempotent by log id if provided.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { isDailyLimit, nextIstMidnight } from "../_shared/merittoBulk.ts";
import { MERITTO_CLIENTS, resolveMerittoClient, type MerittoClientConfig } from "../_shared/merittoClients.ts";

type LeadInput = {
  client?: string; // gim (default) | abbs — which Meritto account receives the lead
  log_id?: string;
  source: string; // e.g. business_inquiry, contact, demo_lead, signup
  name?: string;
  email?: string;
  mobile?: string;
  state?: string;
  city?: string;
  campus?: string;
  course?: string;
  specialization?: string; // required by some clients (e.g. ABBS)
  medium?: string;
  campaign?: string;
  origin_domain?: string; // e.g. bschoolbuzz.in, mbacompass.in — tracked via sub_source
  extra?: Record<string, unknown>;
};

function sanitizeMobile(m?: string) {
  if (!m) return "";
  const digits = m.replace(/\D/g, "");
  // Meritto expects 10-digit Indian mobile in most configs
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

function redact(body: Record<string, unknown>) {
  const clone: Record<string, unknown> = { ...body };
  if (typeof clone.secret_key === "string") {
    const s = clone.secret_key as string;
    clone.secret_key = s.length > 8 ? `${s.slice(0, 4)}…${s.slice(-4)}` : "***";
  }
  return clone;
}

async function callMeritto(secret: string, lead: LeadInput, cid: string, cfg: MerittoClientConfig) {
  // Meritto binds `source=bschoolbuzz` to the URL path — it cannot be changed.
  // To distinguish which of our domains the lead came from (bschoolbuzz /
  // bschoolbuzz.in / mbacompass.in), we tag the origin domain into multiple
  // sub-source/UTM fields so it's visible on the Meritto dashboard and CSV
  // exports without triggering "Invalid Source".
  const domain = (lead.origin_domain || "").trim().toLowerCase();
  const baseMedium = lead.medium ?? "website";
  const medium = domain ? `${baseMedium} | ${domain}` : baseMedium;
  const baseCampaign = lead.campaign ?? lead.source;
  const campaign = domain ? `${baseCampaign} | ${domain}` : baseCampaign;

  const body: Record<string, unknown> = {
    name: lead.name ?? "",
    email: lead.email ?? "",
    mobile: sanitizeMobile(lead.mobile),
    source: cfg.source,
    college_id: cfg.collegeId,
    secret_key: secret,
    state: lead.state ?? "",
    city: lead.city ?? "",
    campus: lead.campus ?? "",
    course: lead.course ?? "",
    ...(lead.specialization ? { specialization: lead.specialization } : {}),
    medium,
    campaign,
    sub_source: domain || "bschoolbuzz",
    utm_source: domain || "bschoolbuzz",
    utm_medium: baseMedium,
    utm_campaign: baseCampaign,
    lead_origin: domain || "bschoolbuzz",
    ...(lead.extra ?? {}),
  };

  const startedAt = Date.now();
  console.log(`[meritto:${cfg.id}][${cid}] → POST ${cfg.url}`, {
    origin_domain: domain || null,
    lead_source: lead.source,
    payload: redact(body),
  });

  let res: Response;
  try {
    res = await fetch(cfg.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    console.error(`[meritto][${cid}] ✗ network error after ${durationMs}ms`, err);
    throw err;
  }

  const text = await res.text();
  const durationMs = Date.now() - startedAt;
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  const merittoStatus = (json?.status ?? "").toString().toLowerCase();
  const merittoMessage = (json?.message ?? "").toString();
  const msgLower = merittoMessage.toLowerCase();

  // Classify Meritto's business response into an outcome.
  //  - success  : lead accepted
  //  - duplicate: mobile/email already in Meritto (not an error, still logged)
  //  - invalid  : validation error (bad mobile, missing field, invalid source, etc.)
  //  - failed   : HTTP/network or unknown provider error
  let outcome: "success" | "duplicate" | "invalid" | "failed";
  if (!res.ok) {
    outcome = "failed";
  } else if (merittoStatus === "" || merittoStatus === "success" || merittoStatus === "ok") {
    outcome = "success";
  } else if (merittoStatus === "duplicate" || msgLower.includes("already registered") || msgLower.includes("duplicate")) {
    outcome = "duplicate";
  } else if (
    merittoStatus === "error" ||
    merittoStatus === "invalid" ||
    merittoStatus === "fail" ||
    merittoStatus === "failed" ||
    msgLower.includes("invalid") ||
    msgLower.includes("required") ||
    msgLower.includes("mandatory") ||
    msgLower.includes("missing")
  ) {
    outcome = "invalid";
  } else {
    outcome = "failed";
  }

  const ok = outcome === "success" || outcome === "duplicate";

  console.log(`[meritto][${cid}] ← HTTP ${res.status} in ${durationMs}ms`, {
    ok,
    outcome,
    meritto_status: json?.status ?? null,
    meritto_message: json?.message ?? null,
    response_preview: text.slice(0, 500),
  });

  return { ok, outcome, status: res.status, json, body, durationMs };
}

// Simple in-memory per-IP rate limiter: max 5 requests / 60s window.
const RL = new Map<string, { count: number; reset: number }>();
function rateLimit(ip: string, max = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const cur = RL.get(ip);
  if (!cur || cur.reset < now) {
    RL.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }
  if (cur.count >= max) return false;
  cur.count++;
  return true;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


async function runBulkTick(token: string): Promise<Response> {
  const json = (b: unknown, st = 200) => new Response(JSON.stringify(b), { status: st, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const url = Deno.env.get("SUPABASE_URL"); const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "not configured" }, 500);
  const admin = createClient(url, key);
  const { data: w } = await admin.from("meritto_bulk_worker").select("token").eq("id", true).maybeSingle();
  if (!token || !w?.token || w.token !== token) return json({ error: "forbidden" }, 403);

  const started = Date.now();
  const results: Record<string, unknown> = {};
  for (const cfg of Object.values(MERITTO_CLIENTS)) {
    if (Date.now() - started > 40_000) break;
    const secret = Deno.env.get(cfg.secretEnv);
    if (!secret) { results[cfg.id] = { skipped: "secret missing" }; continue; }
    const { data: sw } = await admin.from("site_settings").select("value").eq("key", cfg.switchKey).maybeSingle();
    if (!(sw?.value as { enabled?: boolean } | null)?.enabled) { results[cfg.id] = { skipped: "integration off" }; continue; }
    const { data: job } = await admin.from("meritto_bulk_jobs").select("*").eq("status", "running").eq("client", cfg.id).order("created_at").limit(1).maybeSingle();
    if (!job) { results[cfg.id] = { idle: true }; continue; }
    results[cfg.id] = await runBulkJob(admin, cfg, secret, job, started);
  }
  return json({ ok: true, ...results });
}

// deno-lint-ignore no-explicit-any
async function runBulkJob(admin: any, cfg: MerittoClientConfig, secret: string, job: any, started: number) {
  let processed = 0;
  while (Date.now() - started < 40_000) {
    const { data: batch } = await admin.rpc("meritto_bulk_claim", { p_job: job.id, p_limit: 5 });
    const items = (batch ?? []) as { id: string; lead: LeadInput }[];
    if (!items.length) break;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const lead: LeadInput = { ...it.lead, origin_domain: it.lead.origin_domain ?? job.origin_domain ?? undefined };
      let res: Awaited<ReturnType<typeof callMeritto>> | null = null;
      try { res = await callMeritto(secret, lead, `bulk-${it.id.slice(0, 6)}`, cfg); } catch (e) {
        await admin.from("meritto_bulk_items").update({ status: "failed", error: `Network: ${String(e)}`, processed_at: new Date().toISOString(), locked_at: null }).eq("id", it.id);
        processed++; continue;
      }
      if (isDailyLimit(res.status, res.json)) {
        // Return this and the rest of the claimed rows to the queue; resume after midnight IST.
        await admin.from("meritto_bulk_items").update({ status: "pending", locked_at: null }).in("id", items.slice(i).map((x) => x.id));
        await admin.from("meritto_bulk_jobs").update({ status: "paused_limit", resume_at: nextIstMidnight(), last_error: res.json?.message ? `Meritto: ${res.json.message}` : `HTTP ${res.status}` }).eq("id", job.id);
        return { paused: true, processed };
      }
      const errMsg = res.outcome === "success" ? null : (res.json?.message ? `Meritto: ${res.json.message}` : `HTTP ${res.status}`);
      const { data: log } = await admin.from("meritto_lead_logs").insert({
        client: cfg.id,
        source: lead.source ?? "bulk_upload", name: lead.name, email: lead.email, mobile: lead.mobile, state: lead.state, city: lead.city,
        campus: lead.campus, course: lead.course, medium: lead.medium, campaign: lead.campaign,
        payload: redact(res.body), response: res.json, http_status: res.status, status: res.outcome, error: errMsg, last_attempt_at: new Date().toISOString(),
      }).select("id").single();
      await admin.from("meritto_bulk_items").update({ status: res.outcome, error: errMsg, http_status: res.status, log_id: log?.id ?? null, processed_at: new Date().toISOString(), locked_at: null }).eq("id", it.id);
      processed++;
    }
  }
  const { count } = await admin.from("meritto_bulk_items").select("id", { count: "exact", head: true }).eq("job_id", job.id).in("status", ["pending", "processing"]);
  if (!count) await admin.from("meritto_bulk_jobs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", job.id).eq("status", "running");
  return { processed, remaining: count ?? 0 };
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Background bulk-upload worker, woken each minute by the database while a job is active.
  if (req.method === "POST" && req.headers.get("content-type")?.includes("application/json")) {
    const peek = await req.clone().json().catch(() => null) as { bulk_tick?: boolean; token?: string } | null;
    if (peek?.bulk_tick) return await runBulkTick(String(peek.token ?? ""));
  }


  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  // Admins pushing leads from the admin panel are exempt; the limit only guards public forms.
  let isAdminCaller = false;
  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (token && url && key) {
      const sb = createClient(url, key);
      const { data: u } = await sb.auth.getUser(token);
      if (u?.user) {
        const { data: role } = await sb.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
        isAdminCaller = !!role;
      }
    }
  } catch { /* treat as public caller */ }
  if (!isAdminCaller && !rateLimit(ip)) {

    const retryAfterSeconds = Math.max(1, Math.ceil(((RL.get(ip)?.reset ?? Date.now() + 60_000) - Date.now()) / 1000) + 1);
    console.warn("[meritto] request rejected before dispatch: rate limit", { retry_after_seconds: retryAfterSeconds });
    return new Response(JSON.stringify({ error: "Submission limit reached. Please wait before continuing.", retry_after_seconds: retryAfterSeconds }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(retryAfterSeconds), "Access-Control-Expose-Headers": "Retry-After" },
    });
  }



  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "Lead submission service is not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const cid = crypto.randomUUID().slice(0, 8);

  try {
    const input = (await req.json()) as LeadInput & { retry_log_id?: string; skip_log?: boolean };
    const skipLog = !!input.skip_log;

    // Which Meritto account receives this lead. Retries always use the client recorded on the log.
    let cfg = resolveMerittoClient(input.client);
    if (input.retry_log_id) {
      const { data: lc } = await admin.from("meritto_lead_logs").select("client").eq("id", input.retry_log_id).maybeSingle();
      if (lc) cfg = resolveMerittoClient(lc.client);
    }
    const secret = Deno.env.get(cfg.secretEnv);
    if (!secret) {
      return new Response(JSON.stringify({ error: `${cfg.label} Meritto secret key missing` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Master switch (Admin → Meritto Integration). When off, nothing is sent or logged.
    const { data: switchRow } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", cfg.switchKey)
      .maybeSingle();
    const enabled = !!(switchRow?.value as { enabled?: boolean } | null)?.enabled;
    if (!enabled) {
      console.log(`[meritto][${cid}] skipped — integration switched off`);
      return new Response(
        JSON.stringify({
          ok: false,
          skipped: true,
          outcome: "skipped",
          reason: `${cfg.label} Meritto integration is switched off in Admin → ${cfg.label} Meritto`,
          log_id: null,
          correlation_id: cid,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }


    // Basic validation (skip when retrying an existing log — those were already validated on first insert).
    if (!input.retry_log_id) {
      if (input.email && !EMAIL_RE.test(String(input.email))) {
        return new Response(JSON.stringify({ error: "Invalid email format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (input.mobile) {
        const digits = String(input.mobile).replace(/\D/g, "");
        if (digits.length < 10 || digits.length > 15) {
          return new Response(JSON.stringify({ error: "Invalid mobile number" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      if (!input.email && !input.mobile) {
        return new Response(JSON.stringify({ error: "email or mobile required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`[meritto][${cid}] incoming`, {
      source: input.source,
      log_id: input.log_id ?? null,
      retry_log_id: input.retry_log_id ?? null,
      skip_log: skipLog,
      origin_domain: input.origin_domain ?? null,
      has_email: !!input.email,
      has_mobile: !!input.mobile,
    });

    // Ephemeral mode: push to Meritto WITHOUT persisting anything to our DB.
    if (skipLog && !input.retry_log_id) {
      const result = await callMeritto(secret, input, cid, cfg);
      console.log(`[meritto][${cid}] ephemeral done`, { ok: result.ok, outcome: result.outcome, http: result.status, ms: result.durationMs });
      return new Response(
        JSON.stringify({ ok: result.ok, outcome: result.outcome, status: result.status, log_id: null, response: result.json, correlation_id: cid, ephemeral: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let logId = input.log_id ?? null;
    let lead: LeadInput = input;

    if (input.retry_log_id) {
      const { data } = await admin
        .from("meritto_lead_logs")
        .select("*")
        .eq("id", input.retry_log_id)
        .maybeSingle();
      if (!data) {
        console.warn(`[meritto][${cid}] retry log not found`, input.retry_log_id);
        return new Response(JSON.stringify({ error: "log not found", correlation_id: cid }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      logId = data.id;
      lead = {
        client: cfg.id,
        source: data.source,
        name: data.name ?? undefined,
        email: data.email ?? undefined,
        mobile: data.mobile ?? undefined,
        state: data.state ?? undefined,
        city: data.city ?? undefined,
        campus: data.campus ?? undefined,
        course: data.course ?? undefined,
        specialization: ((data.payload as { specialization?: string } | null)?.specialization) || undefined,
        medium: data.medium ?? undefined,
        campaign: data.campaign ?? undefined,
      };
    }

    if (!logId) {
      const { data: created } = await admin
        .from("meritto_lead_logs")
        .insert({
          client: cfg.id,
          source: lead.source ?? "unknown",
          name: lead.name,
          email: lead.email,
          mobile: lead.mobile,
          state: lead.state,
          city: lead.city,
          campus: lead.campus,
          course: lead.course,
          medium: lead.medium,
          campaign: lead.campaign,
          payload: lead as unknown as Record<string, unknown>,
          status: "pending",
        })
        .select("id")
        .single();
      logId = created?.id ?? null;
      console.log(`[meritto][${cid}] created log ${logId}`);
    }

    const result = await callMeritto(secret, lead, cid, cfg);

    const finalStatus = result.outcome; // success | duplicate | invalid | failed
    const errMsg = result.outcome === "success"
      ? null
      : ((result.json as any)?.message
          ? `Meritto: ${(result.json as any).message}`
          : `HTTP ${result.status}`);

    if (logId) {
      await admin
        .from("meritto_lead_logs")
        .update({
          payload: redact(result.body) as unknown as Record<string, unknown>,
          response: result.json as unknown as Record<string, unknown>,
          http_status: result.status,
          status: finalStatus,
          error: errMsg,
          retry_count: input.retry_log_id ? (undefined as any) : 0,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", logId);

      if (input.retry_log_id) {
        await admin.rpc("increment_meritto_retry", { p_id: logId }).catch(() => {});
      }
    }

    console.log(`[meritto][${cid}] done`, { log_id: logId, status: finalStatus, http: result.status, ms: result.durationMs, error: errMsg });

    return new Response(
      JSON.stringify({ ok: result.ok, outcome: result.outcome, status: result.status, log_id: logId, response: result.json, correlation_id: cid }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(`[meritto][${cid}] error`, e);
    return new Response(JSON.stringify({ error: String(e), correlation_id: cid }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

