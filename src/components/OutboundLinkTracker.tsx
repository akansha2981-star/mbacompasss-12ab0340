import { useEffect } from "react";
import { shouldTrack } from "@/lib/utmEngine";

/**
 * Site-wide: routes every outbound college/partner link through the central
 * tracker (/go/r), which reuses or creates the tracking link and redirects.
 * Rewrites the href just before the browser follows it, so new-tab and
 * middle-click keep working. Admin and student dashboard pages are skipped.
 */
export default function OutboundLinkTracker() {
  useEffect(() => {
    const rewrite = (e: Event) => {
      const path = window.location.pathname;
      if (path.startsWith("/admin")) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.dataset.utm === "off" || a.dataset.utmDone) return;
      const href = a.href;
      if (!shouldTrack(href)) return;
      const q = new URLSearchParams({ u: href, from: path.slice(0, 300) });
      if (a.dataset.utmCampaign) q.set("c", a.dataset.utmCampaign);
      if (a.dataset.utmContent) q.set("ct", a.dataset.utmContent);
      a.href = `/go/r?${q.toString()}`;
      a.dataset.utmDone = "1";
      const rel = new Set((a.rel || "").split(/\s+/).filter(Boolean));
      rel.add("nofollow");
      a.rel = [...rel].join(" ");
    };
    document.addEventListener("mousedown", rewrite, true);
    document.addEventListener("touchstart", rewrite, { capture: true, passive: true });
    document.addEventListener("keydown", (e) => { if (e.key === "Enter") rewrite(e); }, true);
    document.addEventListener("click", rewrite, true);
    return () => {
      document.removeEventListener("mousedown", rewrite, true);
      document.removeEventListener("touchstart", rewrite, true);
      document.removeEventListener("click", rewrite, true);
    };
  }, []);
  return null;
}
