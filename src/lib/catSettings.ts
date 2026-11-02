import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mergeSettings, type CatCalculatorSettings } from "@/lib/catScoreEngine";

export const catSettingsQuery = {
  queryKey: ["cat-calculator-settings"],
  queryFn: async (): Promise<{ settings: CatCalculatorSettings; updatedAt: string | null }> => {
    const { data } = await supabase.from("cat_calculator_settings").select("data, updated_at").eq("id", "default").maybeSingle();
    return { settings: mergeSettings(data?.data), updatedAt: data?.updated_at ?? null };
  },
  staleTime: 5 * 60_000,
};

export const useCatSettings = () => useQuery(catSettingsQuery);

/** GA4 event helper; no-ops until the deferred GA script has loaded. */
export function trackCatEvent(name: "calculator_started" | "calculator_completed" | "share_clicked" | "alert_signup", params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: (...a: unknown[]) => void; dataLayer?: unknown[] };
  if (w.gtag) w.gtag("event", name, params);
  else (w.dataLayer = w.dataLayer || []).push({ event: name, ...params });
}
