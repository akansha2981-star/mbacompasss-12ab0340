import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Building2, ExternalLink, Filter, GraduationCap } from "lucide-react";
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

  const activeBand = CUTOFF_BANDS.find((b) => b.key === band);
  const initials = (name: string) =>
    name.replace(/[^A-Za-z ]/g, " ").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  const ApplyBtn = ({ url, full }: { url: string | null; full?: boolean }) =>
    url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className={full ? "block" : undefined}>
        <Button size="sm" className={`font-semibold shadow-sm ${full ? "w-full" : ""}`}>
          Apply Now <ExternalLink className="ml-1 h-3.5 w-3.5" />
        </Button>
      </a>
    ) : (
      <span className="text-sm text-muted-foreground">Link soon</span>
    );

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="relative border-b border-border bg-gradient-to-br from-primary/10 via-card to-accent/30 px-5 py-6 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">College shortlist</p>
              <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">CAT-based Cut-offs: Colleges by Percentile Band</h2>
              <p className="mt-1 text-sm text-muted-foreground max-w-xl">Choose your band to compare cut-offs, 2-year fees and placements, then apply directly.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="rounded-xl border border-border bg-card px-4 py-2 text-center">
              <p className="text-xl font-semibold text-primary tabular-nums">{colleges.length}</p>
              <p className="text-sm text-muted-foreground">Colleges</p>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-2 text-center">
              <p className="text-xl font-semibold text-primary tabular-nums">{rows.length}</p>
              <p className="text-sm text-muted-foreground">In this band</p>
            </div>
          </div>
        </div>
      </div>

      {/* Band filters */}
      <div className="border-b border-border bg-muted/20 px-5 py-4 md:px-8">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Filter className="h-4 w-4 text-primary" /> Filter by percentile band
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap" role="tablist">
          {CUTOFF_BANDS.map((b) => {
            const on = band === b.key;
            return (
              <button
                key={b.key}
                role="tab"
                onClick={() => setBand(b.key)}
                aria-selected={on}
                className={`shrink-0 inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-all ${
                  on
                    ? "border-primary bg-primary text-primary-foreground shadow-md"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {b.label}
                <span className={`rounded-md px-1.5 tabular-nums ${on ? "bg-primary-foreground/20" : "bg-muted"}`}>{counts[b.key] || 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 md:p-6">
        {isLoading ? (
          <div className="h-40 rounded-xl bg-muted/30 animate-pulse" />
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <GraduationCap className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Colleges for {activeBand?.label ?? "this band"} are being added. Try another band.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-border">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/40 text-left">
                    <th className="py-3 px-4 text-sm font-semibold text-muted-foreground">College</th>
                    <th className="py-3 px-3 text-center text-sm font-semibold text-muted-foreground">Overall %tile</th>
                    <th className="py-3 px-3 text-center text-sm font-semibold text-muted-foreground">Fees (2 yrs)</th>
                    <th className="py-3 px-3 text-center text-sm font-semibold text-muted-foreground">Highest</th>
                    <th className="py-3 px-3 text-center text-sm font-semibold text-muted-foreground">Average</th>
                    <th className="py-3 px-4 text-right text-sm font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c, i) => (
                    <tr key={c.id} className="border-t border-border transition-colors hover:bg-primary/5">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <span className="w-5 text-sm text-muted-foreground tabular-nums">{i + 1}</span>
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">{initials(c.college_name)}</span>
                          <span className="text-base font-semibold text-foreground">{c.college_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary tabular-nums">{c.overall_percentile || "—"}</span>
                      </td>
                      <td className="py-3 px-3 text-center text-sm text-foreground">{c.fees || "—"}</td>
                      <td className="py-3 px-3 text-center text-sm font-semibold text-foreground">{c.highest_package || "—"}</td>
                      <td className="py-3 px-3 text-center text-sm text-foreground">{c.average_package || "—"}</td>
                      <td className="py-3 px-4 text-right"><ApplyBtn url={c.apply_url} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="grid gap-3 md:hidden">
              {rows.map((c) => (
                <div key={c.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">{initials(c.college_name)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-foreground">{c.college_name}</p>
                      <p className="text-sm text-muted-foreground">Cut-off <span className="font-semibold text-primary">{c.overall_percentile || "—"}</span></p>
                    </div>
                  </div>
                  <div className="mb-3 grid grid-cols-3 gap-2 rounded-lg bg-muted/30 p-2 text-center">
                    <div><p className="text-sm text-muted-foreground">Fees</p><p className="text-sm font-semibold text-foreground">{c.fees || "—"}</p></div>
                    <div><p className="text-sm text-muted-foreground">Highest</p><p className="text-sm font-semibold text-foreground">{c.highest_package || "—"}</p></div>
                    <div><p className="text-sm text-muted-foreground">Average</p><p className="text-sm font-semibold text-foreground">{c.average_package || "—"}</p></div>
                  </div>
                  <ApplyBtn url={c.apply_url} full />
                </div>
              ))}
            </div>
          </>
        )}

        <p className="mt-4 text-sm text-muted-foreground">
          Cut-offs, fees and placement figures are indicative and compiled from publicly reported data. Always verify on the institute's official website before applying.
        </p>
      </div>
    </div>
  );
};

export default CatCutoffColleges;
