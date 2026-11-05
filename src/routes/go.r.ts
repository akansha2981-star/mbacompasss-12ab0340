import { createFileRoute } from "@tanstack/react-router";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

// Resolver used by the site-wide link converter and by B-School Buzz:
// /go/r?u=<destination>&b=<brand>&c=<campaign>&m=<medium>&from=<page>
// Known destinations get (or reuse) a tracking link and redirect. Unknown domains
// show a "you are leaving" page and are queued for admin approval, so this is never an open redirect.
export const Route = createFileRoute("/go/r")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const dest = (url.searchParams.get("u") || "").slice(0, 2000);
        const { normalizeUrl, hostOf, shouldTrack } = await import("@/lib/utmEngine");
        const normalized = normalizeUrl(dest);
        if (!normalized || !shouldTrack(dest)) return Response.redirect(new URL("/", request.url).toString(), 302);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const admin = supabaseAdmin as any;
        const utm = await import("@/lib/utm.server");
        const host = hostOf(normalized);
        const brand = (url.searchParams.get("b") || "").slice(0, 40) || undefined;
        const from = (url.searchParams.get("from") || "").slice(0, 400) || null;
        if (await utm.isAllowedHost(admin, host)) {
          try {
            const { link } = await utm.getOrCreateLink(admin, {
              destination: dest, brand, campaign: url.searchParams.get("c") || undefined,
              medium: url.searchParams.get("m") || undefined, content: url.searchParams.get("ct") || undefined,
              originPage: from, originModule: "auto",
            });
            if (link.status !== "archived") return utm.trackAndRedirect(admin, request, link, from);
          } catch (e) { console.error("utm resolve", e); }
        } else {
          const { data: row } = await admin.from("utm_pending_urls").select("hits").eq("normalized_url", normalized).maybeSingle();
          if (row) await admin.from("utm_pending_urls").update({ hits: row.hits + 1, last_seen_at: new Date().toISOString() }).eq("normalized_url", normalized);
          else await admin.from("utm_pending_urls").insert({ normalized_url: normalized, destination_url: dest, host, brand_key: brand ?? null, first_seen_path: from });
        }
        const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Leaving MBA Compass</title>
<style>body{font-family:system-ui,sans-serif;background:#f4f8fc;color:#1e293b;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:16px}.c{background:#fff;border:1px solid #dbe6f2;border-radius:16px;padding:28px;max-width:440px;text-align:center}a.b{display:inline-block;margin-top:16px;background:#2b7fd6;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600}p{font-size:16px;line-height:1.5}small{font-size:14px;color:#64748b;word-break:break-all}</style></head>
<body><div class="c"><p>You are leaving MBA Compass for an external website.</p><small>${esc(host)}</small><br><a class="b" href="${esc(dest)}" rel="nofollow noopener">Continue</a></div></body></html>`;
        return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
      },
    },
  },
});
