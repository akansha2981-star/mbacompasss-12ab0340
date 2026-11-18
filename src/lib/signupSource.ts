/**
 * Remembers which page a visitor was on when they chose "Continue with Google",
 * and saves it to their profile once the new account exists. Email sign-ups already
 * send the page in signup metadata; Google sign-ups cannot, so the page is kept in
 * localStorage across the Google redirect and written after sign-in.
 */
const KEY = "signup-source";
/** A remembered page older than this is ignored (abandoned sign-in). */
export const SIGNUP_SOURCE_TTL_MS = 2 * 60 * 60 * 1000;
/** Only accounts created this recently are treated as new sign-ups. */
export const NEW_ACCOUNT_WINDOW_MS = 30 * 60 * 1000;

const AUTH_PATHS = ["/auth", "/login", "/student/login", "/signup"];

export type SignupSource = { url: string; name: string; at: number };

const safePath = (p?: string | null) => (p && p.startsWith("/") && !p.startsWith("//") ? p : "");
const isAuthPath = (path: string) => AUTH_PATHS.some((a) => path === a || path.startsWith(`${a}?`) || path.startsWith(`${a}/`));

/**
 * Pick the page to credit. Google buttons on ordinary pages credit that page; on a
 * sign-in page, credit the page the visitor came from (explicit `from`, else a
 * same-site referrer), because the sign-in page itself is not the lead source.
 */
export function resolveSignupPage(input: { current: string; title: string; from?: string | null; referrer?: string; origin: string }): { url: string; name: string } {
  const current = safePath(input.current) || "/";
  const title = (input.title || "").trim() || "Unknown";
  if (!isAuthPath(current)) return { url: current, name: title };
  let previous = safePath(input.from);
  if (previous === "/" && input.from === "/") previous = "";
  if (!previous && input.referrer) {
    try {
      const ref = new URL(input.referrer);
      if (ref.origin === input.origin) previous = safePath(`${ref.pathname}${ref.search}`);
    } catch { /* ignore malformed referrer */ }
  }
  if (previous && !isAuthPath(previous)) return { url: previous, name: `Sign-in page (opened from ${previous})` };
  return { url: current, name: title };
}

/** Whether a remembered page should be saved for this signed-in account. */
export function shouldApplySignupSource(source: SignupSource | null, userCreatedAt: string | undefined, now: number): "apply" | "discard" | "none" {
  if (!source) return "none";
  if (!source.url || now - source.at > SIGNUP_SOURCE_TTL_MS) return "discard";
  const created = userCreatedAt ? Date.parse(userCreatedAt) : NaN;
  if (!Number.isFinite(created) || now - created > NEW_ACCOUNT_WINDOW_MS) return "discard";
  return "apply";
}

export function rememberSignupPage(from?: string | null) {
  if (typeof window === "undefined") return;
  try {
    const { url, name } = resolveSignupPage({
      current: `${window.location.pathname}${window.location.search}`,
      title: document.title,
      from,
      referrer: document.referrer,
      origin: window.location.origin,
    });
    const value: SignupSource = { url: url.slice(0, 500), name: name.slice(0, 200), at: Date.now() };
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch { /* storage unavailable */ }
}

function readSource(): SignupSource | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return v && typeof v.url === "string" && typeof v.at === "number" ? { url: v.url, name: String(v.name || ""), at: v.at } : null;
  } catch { return null; }
}

/** Save the remembered page on a brand-new account's profile, never overwriting an existing one. */
export async function applySignupSource(user: { id: string; created_at?: string }) {
  if (typeof window === "undefined") return;
  const source = readSource();
  const decision = shouldApplySignupSource(source, user.created_at, Date.now());
  if (decision === "none") return;
  if (decision === "discard" || !source) { window.localStorage.removeItem(KEY); return; }
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase
    .from("profiles")
    .update({ signup_page_url: source.url, signup_page_name: source.name || null })
    .eq("user_id", user.id)
    .is("signup_page_url", null)
    .select("user_id");
  if (error) return; // keep it for the next load within the time limit
  const { count } = await supabase.from("profiles").select("user_id", { count: "exact", head: true }).eq("user_id", user.id);
  // Clear once saved, or once a profile exists that already had a page recorded.
  if ((data && data.length > 0) || (count ?? 0) > 0) window.localStorage.removeItem(KEY);
}
