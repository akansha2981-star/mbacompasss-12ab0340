import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(context: any) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Forbidden");
}

export interface CreateLinkInput {
  destination: string;
  brand?: string;
  campaign?: string;
  medium?: string;
  content?: string;
  term?: string;
  collegeId?: string | null;
}

const validLink = (i: CreateLinkInput) => {
  if (!i || typeof i.destination !== "string" || !/^https?:\/\//i.test(i.destination.trim())) throw new Error("Destination must start with http(s)://");
  if (i.destination.length > 2000) throw new Error("URL too long");
  return i;
};

export const createUtmLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validLink)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getOrCreateLink } = await import("./utm.server");
    const { link, created } = await getOrCreateLink(supabaseAdmin, { ...data, originModule: "admin", createdBy: context.userId });
    return { code: link.code as string, id: link.id as string, created };
  });

export const bulkImportUtmLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { rows: CreateLinkInput[] }) => {
    if (!Array.isArray(i?.rows) || i.rows.length === 0) throw new Error("No rows");
    if (i.rows.length > 1000) throw new Error("Maximum 1000 rows per import");
    return i;
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getOrCreateLink } = await import("./utm.server");
    let created = 0, reused = 0;
    const errors: string[] = [];
    for (const [i, r] of data.rows.entries()) {
      try {
        validLink(r);
        const res = await getOrCreateLink(supabaseAdmin, { ...r, originModule: "bulk_import", createdBy: context.userId });
        res.created ? created++ : reused++;
      } catch (e: any) { errors.push(`Row ${i + 2}: ${e?.message || "failed"}`); }
    }
    return { created, reused, errors: errors.slice(0, 50) };
  });

// Existing external links stored in the site's own data.
const SOURCES: { table: string; cols: string[]; campaign: string; module: string; collegeIdCol?: string }[] = [
  { table: "colleges", cols: ["website"], campaign: "college_listing", module: "colleges", collegeIdCol: "id" },
  { table: "application_trackers", cols: ["apply_url", "college_website"], campaign: "college_application", module: "applications" },
  { table: "cat_cutoff_colleges", cols: ["apply_url"], campaign: "college_application", module: "cat_cutoff_colleges" },
  { table: "institutes", cols: ["website"], campaign: "college_listing", module: "institutes" },
  { table: "coaching_of_week", cols: ["website_url"], campaign: "lead_generation", module: "coaching_of_week" },
  { table: "exams", cols: ["official_website"], campaign: "college_listing", module: "exams" },
  { table: "banners", cols: ["link_url"], campaign: "lead_generation", module: "banners" },
];

export const migrateExistingLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { sourceIndex?: number; offset?: number } | undefined) => ({ sourceIndex: Math.max(0, Number(i?.sourceIndex ?? 0)), offset: Math.max(0, Number(i?.offset ?? 0)) }))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { getOrCreateLink } = await import("./utm.server");
    const { shouldTrack } = await import("./utmEngine");
    const BATCH = 100;
    const s = SOURCES[data.sourceIndex];
    if (!s) return { done: true, source: "", sourceIndex: data.sourceIndex, nextOffset: 0, found: 0, created: 0, reused: 0, totalSources: SOURCES.length };
    const cols = [...new Set([...s.cols, ...(s.collegeIdCol ? [s.collegeIdCol] : []), "id"])].join(",");
    const { data: rows, error } = await admin.from(s.table).select(cols).order("id").range(data.offset, data.offset + BATCH - 1);
    const r = { found: 0, created: 0, reused: 0 };
    if (!error) {
      const jobs: Promise<void>[] = [];
      for (const row of rows ?? []) {
        for (const c of s.cols) {
          let v = String(row[c] || "").trim();
          if (v && !/^https?:\/\//i.test(v) && /^[\w.-]+\.[a-z]{2,}/i.test(v)) v = `https://${v}`;
          if (!shouldTrack(v)) continue;
          r.found++;
          jobs.push(getOrCreateLink(admin, { destination: v, campaign: s.campaign, collegeId: s.collegeIdCol ? row[s.collegeIdCol] : null, originModule: s.module, createdBy: context.userId })
            .then((res: any) => { res.created ? r.created++ : r.reused++; }).catch(() => {}));
          if (jobs.length >= 10) { await Promise.all(jobs.splice(0)); }
        }
      }
      await Promise.all(jobs);
    }
    const more = !error && (rows?.length ?? 0) === BATCH;
    const nextIndex = more ? data.sourceIndex : data.sourceIndex + 1;
    return { done: nextIndex >= SOURCES.length, source: s.module, sourceIndex: nextIndex, nextOffset: more ? data.offset + BATCH : 0, ...r, totalSources: SOURCES.length };
  });

export const approvePendingUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { normalizedUrl: string; approveDomain: boolean }) => i)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: p } = await admin.from("utm_pending_urls").select("*").eq("normalized_url", data.normalizedUrl).maybeSingle();
    if (!p) throw new Error("Not found");
    if (data.approveDomain) await admin.from("utm_allowed_domains").upsert({ domain: p.host, note: "Approved from pending links" });
    const { getOrCreateLink } = await import("./utm.server");
    const { link } = await getOrCreateLink(admin, { destination: p.destination_url, brand: p.brand_key || undefined, originPage: p.first_seen_path, originModule: "auto", createdBy: context.userId });
    await admin.from("utm_pending_urls").delete().eq("normalized_url", data.normalizedUrl);
    return { code: link.code as string };
  });

export const runUtmHealthCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { ids?: string[] }) => i ?? {})
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    let q = admin.from("utm_links").select("id,destination_url").neq("status", "archived").order("health_checked_at", { ascending: true, nullsFirst: true }).limit(40);
    if (data.ids?.length) q = admin.from("utm_links").select("id,destination_url").in("id", data.ids.slice(0, 40));
    const { data: links } = await q;
    const results = await Promise.all((links ?? []).map(async (l: any) => {
      let code = 0, status = "broken";
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        let res = await fetch(l.destination_url, { method: "HEAD", redirect: "follow", signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0 MBACompassLinkCheck" } });
        if (res.status === 405 || res.status === 403) res = await fetch(l.destination_url, { method: "GET", redirect: "follow", signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0 MBACompassLinkCheck" } });
        clearTimeout(t);
        code = res.status;
        status = code < 400 ? (res.redirected ? "redirected" : "healthy") : code === 403 || code === 429 ? "blocked" : "broken";
      } catch { status = "unreachable"; }
      await admin.from("utm_links").update({ health_status: status, health_http_status: code || null, health_checked_at: new Date().toISOString() }).eq("id", l.id);
      return status;
    }));
    return { checked: results.length, broken: results.filter((s) => s === "broken" || s === "unreachable").length };
  });
