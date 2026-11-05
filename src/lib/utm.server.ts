// Server-only core of the UTM engine: get-or-create with duplicate prevention,
// college detection and destination allow-listing. Import dynamically inside handlers.
import { buildFinalUrl, campaignName, generateCode, hostMatches, hostOf, normalizeUrl, slugPart } from "./utmEngine";

export interface LinkRequest {
  destination: string;
  brand?: string;
  campaign?: string; // campaign key, e.g. college_application
  medium?: string;
  content?: string;
  term?: string;
  collegeId?: string | null;
  originPage?: string | null;
  originModule?: string | null;
  createdBy?: string | null;
}

export async function loadSettings(admin: any) {
  const { data } = await admin.from("utm_settings").select("*").eq("id", 1).maybeSingle();
  return data ?? { default_brand: "mba_compass", default_medium: "website", campaign_year: "2027", auto_convert_links: true, conversion_secret: "" };
}

/** Prefer the existing college database; flag for review instead of guessing. */
export async function detectCollege(admin: any, host: string, collegeId?: string | null) {
  if (collegeId) {
    const { data } = await admin.from("colleges").select("id,name").eq("id", collegeId).maybeSingle();
    if (data) return { college_id: data.id, college_name: data.name, college_needs_review: false };
  }
  // Earlier verified mapping for the same domain.
  const { data: prior } = await admin.from("utm_links").select("college_id,college_name").eq("host", host).eq("college_needs_review", false).not("college_id", "is", null).limit(1);
  if (prior?.[0]) return { college_id: prior[0].college_id, college_name: prior[0].college_name, college_needs_review: false };
  const bare = host.split(".").slice(-3).join(".");
  const { data: cands } = await admin.from("colleges").select("id,name,website").ilike("website", `%${bare.replace(/[%_]/g, "")}%`).limit(10);
  const matches = (cands ?? []).filter((c: any) => { const h = hostOf(/^https?:/i.test(c.website || "") ? c.website : `https://${c.website}`); return h && (host === h || host.endsWith(`.${h}`) || h.endsWith(`.${host}`)); });
  const ids = new Set(matches.map((m: any) => m.id));
  if (ids.size === 1) return { college_id: matches[0].id, college_name: matches[0].name, college_needs_review: false };
  return { college_id: null, college_name: null, college_needs_review: true };
}

/** Only destinations we know about may auto-redirect (prevents open redirects). */
export async function isAllowedHost(admin: any, host: string): Promise<boolean> {
  if (!host) return false;
  const { data: allowed } = await admin.from("utm_allowed_domains").select("domain");
  if (hostMatches(host, (allowed ?? []).map((a: any) => a.domain))) return true;
  const { count } = await admin.from("utm_links").select("id", { count: "exact", head: true }).eq("host", host);
  if ((count ?? 0) > 0) return true;
  const { data: cols } = await admin.from("colleges").select("website").ilike("website", `%${host.replace(/[%_]/g, "")}%`).limit(5);
  return (cols ?? []).some((c: any) => hostOf(/^https?:/i.test(c.website || "") ? c.website : `https://${c.website}`) === host);
}

/** Reuse an existing link for the same destination + campaign identity, else create one. Race-safe via unique constraint. */
export async function getOrCreateLink(admin: any, req: LinkRequest) {
  const normalized = normalizeUrl(req.destination);
  if (!normalized) throw new Error("Invalid destination URL");
  const settings = await loadSettings(admin);
  const brandKey = slugPart(req.brand || settings.default_brand);
  const { data: brand } = await admin.from("utm_brands").select("key,utm_source,is_active").eq("key", brandKey).maybeSingle();
  if (!brand) throw new Error(`Unknown brand ${brandKey}`);
  const campaignKey = slugPart(req.campaign || "college_application");
  const { data: camp } = await admin.from("utm_campaigns").select("default_medium").eq("key", campaignKey).maybeSingle();
  const identity = {
    normalized_url: normalized,
    brand_key: brand.key,
    utm_source: brand.utm_source,
    utm_medium: slugPart(req.medium || camp?.default_medium || settings.default_medium),
    utm_campaign: campaignName(brand.key, campaignKey, settings.campaign_year),
    utm_content: slugPart(req.content || ""),
    utm_term: slugPart(req.term || ""),
  };
  const find = async () => {
    let q = admin.from("utm_links").select("*");
    for (const [k, v] of Object.entries(identity)) q = q.eq(k, v);
    const { data } = await q.maybeSingle();
    return data;
  };
  const existing = await find();
  if (existing) return { link: existing, created: false };

  const host = hostOf(normalized);
  const college = await detectCollege(admin, host, req.collegeId);
  const destination = req.destination.trim();
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = {
      ...identity, ...college, code: generateCode(), destination_url: destination, host,
      final_url: buildFinalUrl(destination, identity),
      origin_page: req.originPage?.slice(0, 400) ?? null, origin_module: req.originModule?.slice(0, 80) ?? null,
      created_by: req.createdBy ?? null,
    };
    const { data, error } = await admin.from("utm_links").insert(row).select("*").single();
    if (!error) return { link: data, created: true };
    if (error.code === "23505") {
      const again = await find(); // another request created it first
      if (again) return { link: again, created: false };
      continue; // code collision, retry with a new code
    }
    throw new Error(error.message);
  }
  throw new Error("Could not create tracking link");
}

export async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function readCookie(request: Request, name: string): string | null {
  const m = (request.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/** Records the click and returns the redirect response with visitor/session cookies. */
export async function trackAndRedirect(admin: any, request: Request, link: any, fromPath?: string | null): Promise<Response> {
  const { parseUserAgent } = await import("./utmEngine");
  const ua = request.headers.get("user-agent") || "";
  const info = parseUserAgent(ua);
  let vid = readCookie(request, "mc_vid");
  let sid = readCookie(request, "mc_sid");
  const newVisitor = !vid;
  if (!vid) vid = crypto.randomUUID();
  if (!sid) sid = crypto.randomUUID();
  const dest = new URL(link.final_url);
  if (!info.bot && link.status === "active") {
    const visitor_hash = await sha256(vid);
    const session_hash = await sha256(sid);
    const [{ count: seenLink }, { count: seenAny }] = await Promise.all([
      admin.from("utm_clicks").select("id", { count: "exact", head: true }).eq("link_id", link.id).eq("visitor_hash", visitor_hash),
      newVisitor ? Promise.resolve({ count: 0 }) : admin.from("utm_clicks").select("id", { count: "exact", head: true }).eq("visitor_hash", visitor_hash),
    ]);
    let refHost: string | null = null, path: string | null = fromPath ?? null;
    const ref = request.headers.get("referer");
    try { if (ref) { const r = new URL(ref); refHost = r.hostname.replace(/^www\./, ""); path = path ?? r.pathname; } } catch { /* ignore */ }
    const { data: click } = await admin.from("utm_clicks").insert({
      link_id: link.id, visitor_hash, session_hash, is_unique: (seenLink ?? 0) === 0, is_returning: (seenAny ?? 0) > 0,
      referrer_host: refHost?.slice(0, 120) ?? null, page_path: path?.slice(0, 400) ?? null,
      device: info.device, browser: info.browser, os: info.os,
      country: request.headers.get("cf-ipcountry") || null,
    }).select("id").single();
    if (click?.id) dest.searchParams.set("mc_tid", click.id); // lets the college post back a conversion
  }
  const headers = new Headers({ Location: dest.toString(), "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer-when-downgrade" });
  headers.append("Set-Cookie", `mc_vid=${vid}; Path=/go; Max-Age=31536000; SameSite=Lax; Secure; HttpOnly`);
  headers.append("Set-Cookie", `mc_sid=${sid}; Path=/go; Max-Age=1800; SameSite=Lax; Secure; HttpOnly`);
  return new Response(null, { status: 302, headers });
}
