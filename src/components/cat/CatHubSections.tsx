import { useCatSettings } from "@/lib/catSettings";
import { CatCutoffTable, CatSlotDifficulty, CatRelatedLinks, CatVideoSlot, CatPercentileTable, CatStatusBanner } from "./CatWidgets";

/** Settings-driven hub content: model table, cutoffs, slot difficulty, video, spokes, last updated. */
export default function CatHubSections() {
  const { data } = useCatSettings();
  const updated = data?.settings.lastUpdated || data?.updatedAt;
  return (
    <section className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:py-12">
      <CatStatusBanner />
      <div>
        <h2 className="text-xl font-bold text-foreground">Score to percentile model (2026 estimate)</h2>
        <p className="mb-3 mt-1 text-sm text-muted-foreground">The model our calculator uses. Values between points are interpolated.</p>
        <CatPercentileTable />
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground">Expected IIM cut-offs</h2>
        <p className="mb-3 mt-1 text-sm text-muted-foreground">Overall and sectional minimums. Always confirm with each IIM's admission policy.</p>
        <CatCutoffTable />
      </div>
      <div>
        <h2 className="mb-3 text-xl font-bold text-foreground">CAT 2026 slot-wise difficulty</h2>
        <CatSlotDifficulty />
      </div>
      <div>
        <h2 className="mb-3 text-xl font-bold text-foreground">Video: find your response sheet link</h2>
        <CatVideoSlot />
      </div>
      <div>
        <h2 className="mb-3 text-xl font-bold text-foreground">CAT 2026 tools and guides</h2>
        <CatRelatedLinks exclude="/tools/cat-score-calculator" />
      </div>
      {updated && <p className="text-sm text-muted-foreground">Last updated: {new Date(updated).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "long" })}</p>}
    </section>
  );
}
