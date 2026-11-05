// Pure helpers for the centralized UTM tracking engine. Shared by the /go redirect,
// the site-wide link converter, admin tools and tests. No I/O here.

export const OWN_HOSTS = ["mbacompass.in", "mbacompasss.lovable.app", "lovable.app", "localhost"];

// Links that should never be wrapped (social profiles, payments, maps, our own CDN).
export const EXCLUDED_HOSTS = [
  "youtube.com", "youtu.be", "instagram.com", "facebook.com", "fb.com", "linkedin.com", "twitter.com", "x.com",
  "t.me", "telegram.me", "wa.me", "whatsapp.com", "api.whatsapp.com", "google.com", "goo.gl", "maps.app.goo.gl",
  "razorpay.com", "rzp.io", "supabase.co", "lovable.dev", "apple.com", "play.google.com",
];

const TRACKING_PARAMS = /^(utm_[a-z]+|gclid|fbclid|msclkid|mc_tid|ref|_ga)$/i;

export function hostOf(url: string): string {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}

export function hostMatches(host: string, list: string[]): boolean {
  return list.some((d) => host === d || host.endsWith(`.${d}`));
}

export function isOwnHost(host: string): boolean {
  return hostMatches(host, OWN_HOSTS);
}

/** True when an outbound link should be routed through the tracker. */
export function shouldTrack(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  const h = hostOf(url);
  if (!h || isOwnHost(h) || hostMatches(h, EXCLUDED_HOSTS)) return false;
  return true;
}

/**
 * Canonical form used for duplicate prevention: lowercase scheme/host, no www,
 * no fragment, tracking params removed, remaining params sorted, no trailing slash.
 */
export function normalizeUrl(input: string): string {
  let u: URL;
  try { u = new URL(input.trim()); } catch { return ""; }
  if (!/^https?:$/.test(u.protocol)) return "";
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const params = [...u.searchParams.entries()].filter(([k]) => !TRACKING_PARAMS.test(k)).sort(([a], [b]) => a.localeCompare(b));
  const qs = params.length ? "?" + params.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&") : "";
  let path = u.pathname.replace(/\/+$/, "");
  if (path === "") path = "";
  const port = u.port && !["80", "443"].includes(u.port) ? `:${u.port}` : "";
  return `https://${host}${port}${path}${qs}`;
}

export function slugPart(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/** Standard campaign name, e.g. mba_compass_college_application_2027. */
export function campaignName(brandKey: string, campaignKey: string, year: string): string {
  return [slugPart(brandKey), slugPart(campaignKey), slugPart(year)].filter(Boolean).join("_");
}

export interface UtmParams {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content?: string;
  utm_term?: string;
}

/** Destination with UTM params applied (existing UTM params replaced). */
export function buildFinalUrl(destination: string, p: UtmParams): string {
  const u = new URL(destination.trim());
  for (const k of [...u.searchParams.keys()]) if (/^utm_/i.test(k)) u.searchParams.delete(k);
  u.searchParams.set("utm_source", p.utm_source);
  u.searchParams.set("utm_medium", p.utm_medium);
  u.searchParams.set("utm_campaign", p.utm_campaign);
  if (p.utm_content) u.searchParams.set("utm_content", p.utm_content);
  if (p.utm_term) u.searchParams.set("utm_term", p.utm_term);
  return u.toString();
}

export function generateCode(len = 8): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

export function parseUserAgent(ua: string): { device: string; browser: string; os: string; bot: boolean } {
  const bot = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i.test(ua);
  const device = /ipad|tablet/i.test(ua) ? "tablet" : /mobi|android|iphone/i.test(ua) ? "mobile" : "desktop";
  const browser = /edg\//i.test(ua) ? "Edge" : /opr\//i.test(ua) ? "Opera" : /samsungbrowser/i.test(ua) ? "Samsung"
    : /chrome|crios/i.test(ua) ? "Chrome" : /firefox|fxios/i.test(ua) ? "Firefox" : /safari/i.test(ua) ? "Safari" : "Other";
  const os = /windows/i.test(ua) ? "Windows" : /android/i.test(ua) ? "Android" : /iphone|ipad|ios/i.test(ua) ? "iOS"
    : /mac os/i.test(ua) ? "macOS" : /linux/i.test(ua) ? "Linux" : "Other";
  return { device, browser, os, bot };
}

/** Growth % between two periods; null when there is no earlier traffic to compare. */
export function growthPct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export const UTM_DATE_RANGES = [
  "today", "yesterday", "7d", "30d", "90d", "this_month", "prev_month", "all", "custom",
] as const;
export type UtmDateRange = (typeof UTM_DATE_RANGES)[number];

/** Range boundaries in IST, returned as UTC ISO strings. `to` is exclusive. */
export function rangeBounds(range: UtmDateRange, now = new Date(), custom?: { from: string; to: string }): { from: string; to: string } {
  const IST = 5.5 * 3600_000;
  const ist = new Date(now.getTime() + IST);
  const dayStart = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d) - IST);
  const y = ist.getUTCFullYear(), m = ist.getUTCMonth(), d = ist.getUTCDate();
  const todayStart = dayStart(y, m, d);
  const end = new Date(todayStart.getTime() + 86400_000);
  const back = (n: number) => new Date(end.getTime() - n * 86400_000);
  switch (range) {
    case "today": return { from: todayStart.toISOString(), to: end.toISOString() };
    case "yesterday": return { from: back(2).toISOString(), to: todayStart.toISOString() };
    case "7d": return { from: back(7).toISOString(), to: end.toISOString() };
    case "30d": return { from: back(30).toISOString(), to: end.toISOString() };
    case "90d": return { from: back(90).toISOString(), to: end.toISOString() };
    case "this_month": return { from: dayStart(y, m, 1).toISOString(), to: end.toISOString() };
    case "prev_month": return { from: dayStart(y, m - 1, 1).toISOString(), to: dayStart(y, m, 1).toISOString() };
    case "custom":
      if (custom?.from && custom?.to) {
        const [fy, fm, fd] = custom.from.split("-").map(Number);
        const [ty, tm, td] = custom.to.split("-").map(Number);
        return { from: dayStart(fy, fm - 1, fd).toISOString(), to: dayStart(ty, tm - 1, td + 1).toISOString() };
      }
      return { from: back(30).toISOString(), to: end.toISOString() };
    default: return { from: "2020-01-01T00:00:00.000Z", to: end.toISOString() };
  }
}
