import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mergeXatSettings, type XatCalculatorSettings } from "@/lib/xatScoreEngine";

export const xatSettingsQuery = {
  queryKey: ["xat-calculator-settings"],
  queryFn: async (): Promise<{ settings: XatCalculatorSettings; updatedAt: string | null }> => {
    const { data } = await supabase.from("xat_calculator_settings").select("data, updated_at").eq("id", "default").maybeSingle();
    return { settings: mergeXatSettings(data?.data), updatedAt: data?.updated_at ?? null };
  },
  staleTime: 5 * 60_000,
};

export const useXatSettings = () => useQuery(xatSettingsQuery);
