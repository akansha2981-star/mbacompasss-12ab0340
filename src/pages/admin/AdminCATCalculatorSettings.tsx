import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { mergeSettings, type CatCalculatorSettings, type ScorePoint, type CatSectionKey } from "@/lib/catScoreEngine";

const toLines = (pts: ScorePoint[]) => pts.map(([s, p]) => `${s} = ${p}`).join("\n");
const fromLines = (t: string): ScorePoint[] =>
  t.split("\n").map((l) => l.split("=").map((x) => Number(x.trim()))).filter((a) => a.length === 2 && a.every(Number.isFinite)).map(([s, p]) => [s, p] as ScorePoint);

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="block space-y-1"><span className="text-sm font-semibold text-foreground">{label}</span>{hint && <span className="block text-sm text-muted-foreground">{hint}</span>}{children}</label>
);

export default function AdminCATCalculatorSettings() {
  const [s, setS] = useState<CatCalculatorSettings | null>(null);
  const [overall, setOverall] = useState("");
  const [sect, setSect] = useState<Record<CatSectionKey, string>>({ VARC: "", DILR: "", QA: "" });
  const [cutoffs, setCutoffs] = useState("");
  const [busy, setBusy] = useState(false);
  const [signups, setSignups] = useState<{ count: number; aggregates: number }>({ count: 0, aggregates: 0 });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("cat_calculator_settings").select("data").eq("id", "default").maybeSingle();
      const m = mergeSettings(data?.data);
      setS(m); setOverall(toLines(m.overall));
      setSect({ VARC: toLines(m.sectional.VARC), DILR: toLines(m.sectional.DILR), QA: toLines(m.sectional.QA) });
      setCutoffs(m.cutoffs.map((c) => [c.institute, c.overall, c.varc, c.dilr, c.qa].join(" | ")).join("\n"));
      const [a, b] = await Promise.all([
        supabase.from("cat_alert_signups").select("id", { count: "exact", head: true }),
        supabase.from("cat_score_aggregates").select("id", { count: "exact", head: true }),
      ]);
      setSignups({ count: a.count ?? 0, aggregates: b.count ?? 0 });
    })();
  }, []);

  if (!s) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  const up = (patch: Partial<CatCalculatorSettings>) => setS({ ...s, ...patch });

  const save = async () => {
    const pts = fromLines(overall);
    if (pts.length < 2) return toast.error("Overall model needs at least two score = percentile lines.");
    const next: CatCalculatorSettings = {
      ...s, overall: pts,
      sectional: { VARC: fromLines(sect.VARC), DILR: fromLines(sect.DILR), QA: fromLines(sect.QA) },
      cutoffs: cutoffs.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((a) => a[0]).map(([institute, o = "", v = "", d = "", q = ""]) => ({ institute, overall: o, varc: v, dilr: d, qa: q })),
    };
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("cat_calculator_settings").upsert({ id: "default", data: next as never, updated_at: new Date().toISOString(), updated_by: u.user?.id ?? null });
    setBusy(false);
    if (error) return toast.error(`Save failed: ${error.message}`);
    setS(next); toast.success("Saved. Live on the calculator and CAT pages.");
  };

  const exportSignups = async () => {
    const { data, error } = await supabase.from("cat_alert_signups").select("email, whatsapp, source_path, created_at").order("created_at", { ascending: false }).limit(10000);
    if (error || !data) return toast.error("Export failed");
    const csv = ["email,whatsapp,source,created_at", ...data.map((r) => [r.email ?? "", r.whatsapp ?? "", r.source_path ?? "", r.created_at].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "cat-alert-signups.csv"; a.click();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">CAT Calculator Settings</h1>
        <p className="text-sm text-muted-foreground">Edit the percentile model, cut-offs, answer-key status and banner. Changes go live without a developer.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">Alert signups</p><p className="text-2xl font-bold text-foreground">{signups.count}</p><Button size="sm" variant="outline" className="mt-2" onClick={exportSignups}>Download CSV</Button></div>
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">Anonymous scores collected</p><p className="text-2xl font-bold text-foreground">{signups.aggregates}</p></div>
      </div>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-xl font-bold text-foreground">Percentile model</h2>
        <Field label="Overall: raw score = percentile (one per line)" hint="Values between lines are interpolated.">
          <Textarea rows={10} value={overall} onChange={(e) => setOverall(e.target.value)} className="font-mono" />
        </Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.overallVerified} onChange={(e) => up({ overallVerified: e.target.checked })} /> Overall data verified against official CAT results (removes the "indicative" label)</label>
        <div className="grid gap-3 md:grid-cols-3">
          {(["VARC", "DILR", "QA"] as CatSectionKey[]).map((k) => (
            <Field key={k} label={`${k} sectional`} hint="Empty = sectional percentile hidden.">
              <Textarea rows={7} value={sect[k]} onChange={(e) => setSect({ ...sect, [k]: e.target.value })} className="font-mono" />
            </Field>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(["1", "2", "3"] as const).map((k) => (
            <Field key={k} label={`Slot ${k} factor`} hint="1 = neutral">
              <Input type="number" step="0.01" value={s.slotFactors[k]} onChange={(e) => up({ slotFactors: { ...s.slotFactors, [k]: Number(e.target.value) || 1 } })} />
            </Field>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-xl font-bold text-foreground">Cut-offs</h2>
        <Field label="Institute | Overall | VARC | DILR | QA (one per line)" hint="Empty = page shows a 'coming soon' note.">
          <Textarea rows={8} value={cutoffs} onChange={(e) => setCutoffs(e.target.value)} className="font-mono" placeholder="IIM Ahmedabad | 99+ | 85 | 85 | 85" />
        </Field>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-xl font-bold text-foreground">Status and updates</h2>
        <Field label="Top banner (leave blank to hide)"><Input value={s.statusBanner} onChange={(e) => up({ statusBanner: e.target.value })} placeholder="CAT 2026 answer key released for all slots" /></Field>
        <div className="grid gap-3 md:grid-cols-3">
          {(["1", "2", "3"] as const).map((k) => (
            <Field key={k} label={`Slot ${k} answer key status`}><Input value={s.answerKeyStatus[k]} onChange={(e) => up({ answerKeyStatus: { ...s.answerKeyStatus, [k]: e.target.value } })} /></Field>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {s.slotDifficulty.map((d, i) => (
            <Field key={d.slot} label={`${d.slot} difficulty note`}>
              <Textarea rows={3} value={d.note} onChange={(e) => up({ slotDifficulty: s.slotDifficulty.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)) })} />
            </Field>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Last updated (shown on pages)" hint="Blank = uses the save time."><Input type="datetime-local" value={s.lastUpdated ? s.lastUpdated.slice(0, 16) : ""} onChange={(e) => up({ lastUpdated: e.target.value ? new Date(e.target.value).toISOString() : "" })} /></Field>
          <Field label="YouTube video link (response sheet walkthrough)"><Input value={s.videoUrl} onChange={(e) => up({ videoUrl: e.target.value })} placeholder="https://youtu.be/..." /></Field>
        </div>
      </section>

      <Button onClick={save} disabled={busy} size="lg">{busy ? "Saving…" : "Save settings"}</Button>
    </div>
  );
}
