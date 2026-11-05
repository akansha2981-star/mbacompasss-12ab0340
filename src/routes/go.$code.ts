import { createFileRoute } from "@tanstack/react-router";

// Short tracking link: https://mbacompass.in/go/{code}. Only redirects to the saved destination.
export const Route = createFileRoute("/go/$code")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const code = String(params.code || "").toLowerCase();
        const home = new URL("/", request.url).toString();
        if (!/^[a-z0-9]{6,16}$/.test(code)) return Response.redirect(home, 302);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { trackAndRedirect } = await import("@/lib/utm.server");
        const { data: link } = await (supabaseAdmin as any).from("utm_links").select("*").eq("code", code).maybeSingle();
        if (!link || link.status === "archived") return Response.redirect(home, 302);
        return trackAndRedirect(supabaseAdmin, request, link);
      },
    },
  },
});
