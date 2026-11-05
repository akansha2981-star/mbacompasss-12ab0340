import { createFileRoute } from "@tanstack/react-router";

// Conversion postback for partner colleges / B-School Buzz.
// GET or POST ?key=<conversion secret>&tid=<mc_tid click id>&event=application&value=0
export const Route = createFileRoute("/api/public/utm-conversion")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});

async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  let body: Record<string, string> = {};
  if (request.method === "POST") { try { body = await request.json(); } catch { /* query only */ } }
  const get = (k: string) => String(body[k] ?? url.searchParams.get(k) ?? "");
  const key = get("key"), tid = get("tid");
  const event = get("event").replace(/[^a-z0-9_]/gi, "").slice(0, 40) || "conversion";
  const value = Number(get("value"));
  if (!/^[0-9a-f-]{36}$/i.test(tid) || key.length < 16) return Response.json({ ok: false }, { status: 400 });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;
  const { data: s } = await admin.from("utm_settings").select("conversion_secret").eq("id", 1).maybeSingle();
  if (!s?.conversion_secret || s.conversion_secret !== key) return Response.json({ ok: false }, { status: 401 });
  const { data: click } = await admin.from("utm_clicks").select("id,link_id").eq("id", tid).maybeSingle();
  if (!click) return Response.json({ ok: false }, { status: 404 });
  const { count } = await admin.from("utm_conversions").select("id", { count: "exact", head: true }).eq("click_id", tid).eq("event_type", event);
  if ((count ?? 0) === 0) await admin.from("utm_conversions").insert({ link_id: click.link_id, click_id: tid, event_type: event, value: Number.isFinite(value) && value > 0 ? value : null });
  return Response.json({ ok: true });
}
