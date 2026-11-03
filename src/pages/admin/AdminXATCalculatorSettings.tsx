import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { mergeXatSettings, type XatCalculatorSettings, type XatSectionKey } from "@/lib/xatScoreEngine";
import type { ScorePoint } from "@/lib/catScoreEngine";

const toLines = (pts: ScorePoint[]) => pts.map(([s, p]) => `${s} = ${p}`).join("\n");
const fromLines = (t: string): ScorePoint[] =>
  t.split("\n").map((l) => l.split("=").map((x) => Number(x.trim()))).filter((a) => a.length === 2 && a.every(Number.isFinite)).map(([s, p]) => [s, p] as ScorePoint);
const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="block space-y-1"><span className="text-sm font-semibold text-foreground">{label}</span>{hint && <span className="block text-sm text-muted-foreground">{hint}</span>}{children}</label>
);
const KEYS: XatSectionKey[] = ["VALR", "DM", "QADI", "GK"];

export default function AdminXATCalculatorSettings() {
  const [s, setS] = useState<XatCalculatorSettings | null>(null);
  const [overall, setOverall] = useState("");
  const [cutoffs, setCutoffs] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("xat_calculator_settings").select("data").eq("id", "default").maybeSingle();
      const m = mergeXatSettings(data?.data);
      setS(m); setOverall(toLines(m.overall));
      setCutoffs(m.cutoffs.map((c) => [c.institute, c.overall, c.valr, c.dm, c.qadi].join(" | ")).join("\n"));
    })();
  }, []);
  if (!s) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  const up = (p: Partial<XatCalculatorSettings>) => setS({ ...s, ...p });

  const save = async () => {
    const pts = fromLines(overall);
    if (pts.length < 2) return toast.error("Percentile model needs at least two score = percentile lines.");
    const next: XatCalculatorSettings = { ...s, overall: pts,
      cutoffs: cutoffs.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((a) => a[0]).map(([institute, o = "", v = "", d = "", q = ""]) => ({ institute, overall: o, valr: v, dm: d, qadi: q })) };
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("xat_calculator_settings").upsert({ id: "default", data: next as never, updated_at: new Date().toISOString(), updated_by: u.user?.id ?? null });
    setBusy(false);
    if (error) return toast.error(`Save failed: ${error.message}`);
    setS(next); toast.success("Saved. Live on the XAT calculator and pages.");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <h1 className="text-2xl font-bold text-foreground">XAT Calculator Settings</h1>
      <Field label="Score to percentile model" hint="One line per point: Part 1 score = percentile">
        <Textarea rows={10} value={overall} onChange={(e) => setOverall(e.target.value)} className="font-mono" />
      </Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.overallVerified} onChange={(e) => up({ overallVerified: e.target.checked })} /> Model verified against official data</label>
      <Field label="Questions per section" hint="Used by the manual calculator and pattern tables">
        <div className="grid grid-cols-4 gap-2">{KEYS.map((k) => <label key={k} className="text-sm">{k}<Input type="number" value={s.pattern[k]} onChange={(e) => up({ pattern: { ...s.pattern, [k]: Math.max(0, Number(e.target.value) || 0) } })} /></label>)}</div>
      </Field>
      <Field label="Cut-offs" hint="One line per institute: Institute | Overall | VALR | DM | QA&DI. Leave empty until verified.">
        <Textarea rows={6} value={cutoffs} onChange={(e) => setCutoffs(e.target.value)} className="font-mono" />
      </Field>
      <Field label="Exam date note"><Input value={s.examDateNote} onChange={(e) => up({ examDateNote: e.target.value })} /></Field>
      <Field label="Answer key status"><Input value={s.answerKeyStatus} onChange={(e) => up({ answerKeyStatus: e.target.value })} /></Field>
      <Field label="Status banner" hint="Shown on top of every XAT page when filled"><Input value={s.statusBanner} onChange={(e) => up({ statusBanner: e.target.value })} /></Field>
      <Field label="Video URL (YouTube)"><Input value={s.videoUrl} onChange={(e) => up({ videoUrl: e.target.value })} /></Field>
      <Field label="Last updated (optional)"><Input type="date" value={s.lastUpdated} onChange={(e) => up({ lastUpdated: e.target.value })} /></Field>
      <Button onClick={save} disabled={busy}>{busy ? "Saving..." : "Save settings"}</Button>
    </div>
  );
}
