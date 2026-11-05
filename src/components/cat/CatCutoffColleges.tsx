import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ExternalLink, GraduationCap } from "lucide-react";
import { CUTOFF_BANDS, collegeTags, type CatCutoffCollege } from "@/lib/catCutoffColleges";

/**
 * CAT-based cut-off college table with percentile-band filters.
 * Rows are managed from /admin/cat-cutoff-colleges.
 */
const CatCutoffColleges: React.FC = () => {
  const [band, setBand] = useState<string>(CUTOFF_BANDS[0].key);

  const { data: colleges = [], isLoading } = useQuery({
    queryKey: ["cat-cutoff-colleges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cat_cutoff_colleges")
        .select("id, college_name, cutoff_band, cutoff_tags, overall_percentile, fees, highest_package, average_package, apply_url, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("college_name", { ascending: true });
      if (error) throw error;
      return (data || []) as CatCutoffCollege[];
    },
    staleTime: 5 * 60_000,
  });

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of colleges) for (const k of collegeTags(c)) m[k] = (m[k] || 0) + 1;
    return m;
  }, [colleges]);

  const rows = useMemo(() => colleges.filter((c) => collegeTags(c).includes(band)), [colleges, band]);

  // Hide the whole section until the admin has added at least one college.
  if (!isLoading && colleges.length === 0) return null;

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">CAT-based Cut-offs: Colleges by Percentile Band</h2>
        <p className="text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Pick your percentile band to see colleges you can target, with fees, placements and a direct application link.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {CUTOFF_BANDS.map((b) => (
          <button
            key={b.key}
            onClick={() => setBand(b.key)}
            aria-pressed={band === b.key}
            className={`rounded-full px-4 py-2.5 text-sm font-semibold shadow-sm transition-all ${
              band === b.key
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            }`}
          >
            {b.label}
            {counts[b.key] ? <span className="ml-1.5 opacity-70">({counts[b.key]})</span> : null}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-40 rounded-2xl bg-muted/30 animate-pulse" />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <GraduationCap className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Colleges for this band are being added. Check another band above.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="cat-table w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-border bg-primary/5">
                <th className="text-left py-3 px-4 text-foreground">College Name</th>
                <th className="text-center py-3 px-3 text-foreground">Overall %tile</th>
                <th className="text-center py-3 px-3 text-foreground">Fees (2 years)</th>
                <th className="text-center py-3 px-3 text-foreground">Highest Package</th>
                <th className="text-center py-3 px-3 text-foreground">Average Package</th>
                <th className="text-center py-3 px-4 text-foreground">Apply</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-semibold text-foreground">{c.college_name}</td>
                  <td className="text-center py-3 px-3 font-bold text-primary tabular-nums">{c.overall_percentile || "—"}</td>
                  <td className="text-center py-3 px-3 text-foreground">{c.fees || "—"}</td>
                  <td className="text-center py-3 px-3 text-foreground">{c.highest_package || "—"}</td>
                  <td className="text-center py-3 px-3 text-foreground">{c.average_package || "—"}</td>
                  <td className="text-center py-3 px-4">
                    {c.apply_url ? (
                      <a href={c.apply_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" className="font-semibold">
                          Apply Now <ExternalLink className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-center text-sm text-muted-foreground">
        Cut-offs, fees and placement figures are indicative and compiled from publicly reported data. Always verify on the institute's official website before applying.
      </p>
    </div>
  );
};

export default CatCutoffColleges;
