import { Link } from "@tanstack/react-router";
import { useCatSettings } from "@/lib/catSettings";
import { DEFAULT_CAT_SETTINGS, CAT_SECTIONS } from "@/lib/catScoreEngine";
import { CAT_SPOKES, CAT_HUB_PATH } from "@/lib/catSpokes";

const Todo = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">{children}</p>
);

export function CatPercentileTable() {
  const s = useCatSettings().data?.settings ?? DEFAULT_CAT_SETTINGS;
  const rows = [...s.overall].filter(([sc]) => sc > 0 && sc < 204).sort((a, b) => b[0] - a[0]);
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="cat-table w-full">
        <thead className="bg-muted/50"><tr><th className="px-4 py-2 text-left font-medium text-muted-foreground">Raw score (out of 204)</th><th className="px-4 py-2 text-left font-medium text-muted-foreground">Estimated percentile</th></tr></thead>
        <tbody>{rows.map(([sc, p]) => <tr key={sc} className="border-t border-border"><td className="px-4 py-2 tabular-nums text-foreground">{sc}</td><td className="px-4 py-2 tabular-nums font-semibold text-primary">{p}</td></tr>)}</tbody>
      </table>
      <p className="border-t border-border px-4 py-2 text-sm text-muted-foreground">{s.overallVerified ? "Based on verified CAT data." : "Indicative, based on CAT 2025 data. Not official; normalisation may change your final percentile."}</p>
    </div>
  );
}

export function CatCutoffTable() {
  const s = useCatSettings().data?.settings ?? DEFAULT_CAT_SETTINGS;
  if (!s.cutoffs.length) return <Todo>Expected IIM-wise cut-offs for CAT 2026 will be published here once verified. We do not show unverified figures.</Todo>;
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="cat-table w-full">
        <thead className="bg-muted/50"><tr>{["Institute", "Overall", "VARC", "DILR", "QA"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{s.cutoffs.map((c) => <tr key={c.institute} className="border-t border-border"><td className="px-3 py-2 font-semibold text-foreground">{c.institute}</td><td className="px-3 py-2">{c.overall}</td><td className="px-3 py-2">{c.varc}</td><td className="px-3 py-2">{c.dilr}</td><td className="px-3 py-2">{c.qa}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export function CatSlotDifficulty() {
  const s = useCatSettings().data?.settings ?? DEFAULT_CAT_SETTINGS;
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {s.slotDifficulty.map((d) => <div key={d.slot} className="rounded-xl border border-border bg-card p-3"><p className="text-sm font-semibold text-foreground">{d.slot}</p><p className="mt-1 text-sm text-muted-foreground">{d.note}</p></div>)}
    </div>
  );
}

export function CatAnswerKeyStatus({ slot }: { slot: "1" | "2" | "3" }) {
  const { data } = useCatSettings();
  const s = data?.settings ?? DEFAULT_CAT_SETTINGS;
  const updated = s.lastUpdated || data?.updatedAt;
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <p className="text-sm text-muted-foreground">Slot {slot} answer key status</p>
      <p className="mt-1 text-base font-semibold text-foreground">{s.answerKeyStatus[slot]}</p>
      {updated && <p className="mt-1 text-sm text-muted-foreground">Last updated: {new Date(updated).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST</p>}
    </div>
  );
}

export function CatStatusBanner() {
  const s = useCatSettings().data?.settings;
  if (!s?.statusBanner) return null;
  return <div className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-2 text-center text-sm font-medium text-foreground">{s.statusBanner}</div>;
}

export function CatSectionMarksTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="cat-table w-full">
        <thead className="bg-muted/50"><tr>{["Section", "Questions", "Marks", "Time"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
        <tbody>
          {CAT_SECTIONS.map((s) => <tr key={s.key} className="border-t border-border"><td className="px-3 py-2 font-semibold text-foreground">{s.key}</td><td className="px-3 py-2">{s.questions}</td><td className="px-3 py-2">{s.marks}</td><td className="px-3 py-2">40 min</td></tr>)}
          <tr className="border-t border-border bg-primary/5"><td className="px-3 py-2 font-bold">Total</td><td className="px-3 py-2 font-bold">68</td><td className="px-3 py-2 font-bold">204</td><td className="px-3 py-2 font-bold">120 min</td></tr>
        </tbody>
      </table>
      <p className="border-t border-border px-3 py-2 text-sm text-muted-foreground">+3 per correct answer · −1 per wrong MCQ · 0 per wrong TITA · 0 unattempted</p>
    </div>
  );
}

export function CatRelatedLinks({ exclude }: { exclude?: string }) {
  const links = [...CAT_SPOKES.map((s) => ({ path: s.path, label: s.h1 }))].filter((l) => l.path !== exclude);
  return (
    <nav aria-label="CAT 2026 tools and guides" className="grid gap-2 sm:grid-cols-2">
      {exclude !== CAT_HUB_PATH && (
        <a href={CAT_HUB_PATH} className="cat-cta flex items-center justify-between gap-2 rounded-xl bg-primary px-4 py-3 text-base font-bold text-primary-foreground sm:col-span-2">
          <span>Calculate Your CAT 2026 Score</span><span className="cat-cta-arrow" aria-hidden="true">→</span>
        </a>
      )}
      {links.map((l) => <a key={l.path} href={l.path} className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:text-primary">{l.label}</a>)}
      <Link to="/tools/profile-analyzer" className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:text-primary">AI Profile Analyzer</Link>
    </nav>
  );
}

export function CatVideoSlot() {
  const url = useCatSettings().data?.settings.videoUrl;
  const id = url?.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/)?.[1];
  if (!id) return <Todo>Video walkthrough coming soon.</Todo>;
  return <div className="aspect-video overflow-hidden rounded-xl border border-border"><iframe loading="lazy" className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${id}`} title="How to find your CAT response sheet link" allowFullScreen /></div>;
}
