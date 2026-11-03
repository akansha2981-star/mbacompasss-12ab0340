import { Link } from "@tanstack/react-router";
import { useXatSettings } from "@/lib/xatSettings";
import { DEFAULT_XAT_SETTINGS, XAT_SECTION_LABELS, XAT_PART1, type XatSectionKey } from "@/lib/xatScoreEngine";
import { XAT_SPOKES, XAT_HUB_PATH } from "@/lib/xatSpokes";

const Todo = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">{children}</p>
);
const useS = () => useXatSettings().data?.settings ?? DEFAULT_XAT_SETTINGS;

export function XatPercentileTable() {
  const s = useS();
  const max = XAT_PART1.reduce((a, k) => a + s.pattern[k], 0);
  const rows = [...s.overall].filter(([sc]) => sc > 0 && sc < max).sort((a, b) => b[0] - a[0]);
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="cat-table w-full">
        <thead className="bg-muted/50"><tr><th className="px-4 py-2 text-left font-medium text-muted-foreground">Part 1 score (out of {max})</th><th className="px-4 py-2 text-left font-medium text-muted-foreground">Estimated percentile</th></tr></thead>
        <tbody>{rows.map(([sc, p]) => <tr key={sc} className="border-t border-border"><td className="px-4 py-2 tabular-nums text-foreground">{sc}</td><td className="px-4 py-2 tabular-nums font-semibold text-primary">{p}</td></tr>)}</tbody>
      </table>
      <p className="border-t border-border px-4 py-2 text-sm text-muted-foreground">{s.overallVerified ? "Based on verified XAT data." : "Indicative, based on publicly reported XAT 2025 results. Not official."}</p>
    </div>
  );
}

export function XatCutoffTable() {
  const s = useS();
  if (!s.cutoffs.length) return <Todo>Expected XLRI and B-school cut-offs for XAT 2027 will be published here once verified. We do not show unverified figures.</Todo>;
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="cat-table w-full">
        <thead className="bg-muted/50"><tr>{["Institute", "Overall", "VALR", "DM", "QA&DI"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{s.cutoffs.map((c) => <tr key={c.institute} className="border-t border-border"><td className="px-3 py-2 font-semibold text-foreground">{c.institute}</td><td className="px-3 py-2">{c.overall}</td><td className="px-3 py-2">{c.valr}</td><td className="px-3 py-2">{c.dm}</td><td className="px-3 py-2">{c.qadi}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export function XatAnswerKeyStatus() {
  const { data } = useXatSettings();
  const s = data?.settings ?? DEFAULT_XAT_SETTINGS;
  const updated = s.lastUpdated || data?.updatedAt;
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <p className="text-sm text-muted-foreground">XAT 2027 answer key status</p>
      <p className="mt-1 text-base font-semibold text-foreground">{s.answerKeyStatus}</p>
      {updated && <p className="mt-1 text-sm text-muted-foreground">Last updated: {new Date(updated).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST</p>}
    </div>
  );
}

export function XatStatusBanner() {
  const s = useXatSettings().data?.settings;
  if (!s?.statusBanner) return null;
  return <div className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-2 text-center text-sm font-medium text-foreground">{s.statusBanner}</div>;
}

export function XatPatternTable() {
  const s = useS();
  const keys: XatSectionKey[] = ["VALR", "DM", "QADI", "GK"];
  const p1 = XAT_PART1.reduce((a, k) => a + s.pattern[k], 0);
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="cat-table w-full">
        <thead className="bg-muted/50"><tr>{["Section", "Questions", "Max marks", "In percentile"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
        <tbody>
          {keys.map((k) => <tr key={k} className="border-t border-border"><td className="px-3 py-2 font-semibold text-foreground">{XAT_SECTION_LABELS[k]}</td><td className="px-3 py-2 tabular-nums">{s.pattern[k]}</td><td className="px-3 py-2 tabular-nums">{s.pattern[k]}</td><td className="px-3 py-2">{k === "GK" ? "No" : "Yes"}</td></tr>)}
          <tr className="border-t border-border bg-primary/5"><td className="px-3 py-2 font-bold">Part 1 total</td><td className="px-3 py-2 font-bold tabular-nums">{p1}</td><td className="px-3 py-2 font-bold tabular-nums">{p1}</td><td className="px-3 py-2 font-bold">Yes</td></tr>
        </tbody>
      </table>
      <p className="border-t border-border px-3 py-2 text-sm text-muted-foreground">+1 correct · −0.25 wrong · −0.10 per unattempted Part 1 question after 8 · GK has no negative marking</p>
    </div>
  );
}

export function XatRelatedLinks({ exclude }: { exclude?: string }) {
  const links = XAT_SPOKES.map((s) => ({ path: s.path, label: s.h1 })).filter((l) => l.path !== exclude);
  return (
    <nav aria-label="XAT 2027 tools and guides" className="grid gap-2 sm:grid-cols-2">
      {exclude !== XAT_HUB_PATH && (
        <a href={XAT_HUB_PATH} className="cat-cta flex items-center justify-between gap-2 rounded-xl bg-primary px-4 py-3 text-base font-bold text-primary-foreground sm:col-span-2">
          <span>Calculate Your XAT 2027 Score</span><span className="cat-cta-arrow" aria-hidden="true">→</span>
        </a>
      )}
      {links.map((l) => <a key={l.path} href={l.path} className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:text-primary">{l.label}</a>)}
      <a href="/tools/cat-score-calculator" className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:text-primary">CAT Score Calculator</a>
      <Link to="/tools/profile-analyzer" className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:text-primary">AI Profile Analyzer</Link>
    </nav>
  );
}

export function XatVideoSlot() {
  const url = useXatSettings().data?.settings.videoUrl;
  const id = url?.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/)?.[1];
  if (!id) return <Todo>Video walkthrough coming soon.</Todo>;
  return <div className="aspect-video overflow-hidden rounded-xl border border-border"><iframe loading="lazy" className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${id}`} title="How to find your XAT response sheet link" allowFullScreen /></div>;
}
