import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Share2, Link2, ArrowRight, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  CAT_SECTIONS, CAT_MAX_SCORE, scoreSection, validateSection, percentileBand, percentileMeaning,
  type CatSectionKey, type SectionInput,
} from "@/lib/catScoreEngine";
import { useCatSettings, trackCatEvent } from "@/lib/catSettings";

type Slot = "1" | "2" | "3";
const empty: SectionInput = { correct: 0, wrongMcq: 0, wrongTita: 0 };

export default function CatManualCalculator() {
  const { data } = useCatSettings();
  const settings = data?.settings;
  const [slot, setSlot] = useState<Slot>("1");
  const [inputs, setInputs] = useState<Record<CatSectionKey, SectionInput>>({ VARC: { ...empty }, DILR: { ...empty }, QA: { ...empty } });
  const [shown, setShown] = useState(false);
  const [started, setStarted] = useState(false);
  const [contribute, setContribute] = useState(true);

  const errors = CAT_SECTIONS.map((s) => validateSection(s.key, inputs[s.key])).filter(Boolean) as string[];
  const sections = CAT_SECTIONS.map((s) => scoreSection(s.key, inputs[s.key]));
  const total = sections.reduce((a, s) => a + s.score, 0);
  const attempted = sections.reduce((a, s) => a + s.attempted, 0);
  const correct = sections.reduce((a, s) => a + s.correct, 0);
  const band = useMemo(() => (settings ? percentileBand(settings.overall, total, slot, settings.slotFactors) : null), [settings, total, slot]);
  const sectionBands = settings ? sections.map((s) => ({ s: s.section, b: percentileBand(settings.sectional[s.section] || [], s.score) })) : [];

  const set = (k: CatSectionKey, f: keyof SectionInput, v: string) => {
    if (!started) { setStarted(true); trackCatEvent("calculator_started", { mode: "manual" }); }
    setShown(false);
    setInputs((p) => ({ ...p, [k]: { ...p[k], [f]: Math.max(0, Math.min(99, parseInt(v || "0", 10) || 0)) } }));
  };

  const calculate = async () => {
    if (errors.length) return;
    setShown(true);
    trackCatEvent("calculator_completed", { mode: "manual", slot, score: total });
    if (contribute) {
      await supabase.from("cat_score_aggregates").insert({
        slot: Number(slot), total_score: total, varc_score: sections[0].score, dilr_score: sections[1].score, qa_score: sections[2].score, source: "manual",
      });
    }
  };

  const shareImage = async () => {
    trackCatEvent("share_clicked", { kind: "image" });
    const c = document.createElement("canvas"); c.width = 1080; c.height = 1080;
    const g = c.getContext("2d")!;
    const css = getComputedStyle(document.documentElement);
    const primary = `hsl(${css.getPropertyValue("--primary").trim()})`;
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, 1080, 1080);
    g.fillStyle = primary; g.fillRect(0, 0, 1080, 14);
    g.textAlign = "center"; g.fillStyle = "#334155"; g.font = "600 40px sans-serif"; g.fillText("My CAT 2026 Score", 540, 200);
    g.fillStyle = primary; g.font = "800 200px sans-serif"; g.fillText(String(total), 540, 430);
    g.fillStyle = "#64748b"; g.font = "500 40px sans-serif"; g.fillText(`out of ${CAT_MAX_SCORE}`, 540, 500);
    if (band) { g.fillStyle = "#334155"; g.font = "600 46px sans-serif"; g.fillText(`Estimated percentile ${band.low} – ${band.high}`, 540, 620); }
    g.font = "500 36px sans-serif"; g.fillStyle = "#475569";
    g.fillText(sections.map((s) => `${s.section} ${s.score}`).join("   ·   "), 540, 720);
    g.fillStyle = primary; g.font = "700 40px sans-serif"; g.fillText("mbacompass.in/tools/cat-score-calculator", 540, 960);
    const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/png"));
    if (!blob) return;
    const file = new File([blob], "cat-score.png", { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
    if (nav.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "My CAT 2026 score" }).catch(() => {}); return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "cat-score.png"; a.click();
  };

  const copyLink = async () => {
    trackCatEvent("share_clicked", { kind: "link" });
    await navigator.clipboard.writeText("https://mbacompass.in/tools/cat-score-calculator");
    toast.success("Link copied");
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-sm font-medium text-foreground">Your slot</p>
        <div className="flex gap-2" role="radiogroup" aria-label="CAT slot">
          {(["1", "2", "3"] as Slot[]).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={slot === s} onClick={() => { setSlot(s); setShown(false); }}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${slot === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>Slot {s}</button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-[64px_1fr_1fr_1fr] gap-2 bg-muted/50 px-3 py-2 text-sm font-medium text-muted-foreground">
          <span>Section</span><span>Correct</span><span>Wrong MCQ</span><span>Wrong TITA</span>
        </div>
        {CAT_SECTIONS.map((s, i) => (
          <div key={s.key} className="grid grid-cols-[64px_1fr_1fr_1fr] items-center gap-2 border-t border-border px-3 py-2">
            <span className="text-sm font-semibold text-foreground">{s.key}<span className="block text-sm font-normal text-muted-foreground">{s.questions} Qs</span></span>
            {(["correct", "wrongMcq", "wrongTita"] as const).map((f) => (
              <input key={f} type="number" inputMode="numeric" min={0} max={s.questions} value={inputs[s.key][f] || ""} placeholder="0"
                aria-label={`${s.key} ${f === "correct" ? "correct answers" : f === "wrongMcq" ? "wrong MCQ answers" : "wrong TITA answers"}`}
                onChange={(e) => set(s.key, f, e.target.value)}
                className="w-full min-w-0 rounded-lg border border-border bg-background px-2 py-2 text-base tabular-nums text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20" />
            ))}
            <span className="col-span-4 text-sm text-muted-foreground">Unattempted: {sections[i].unattempted}</span>
          </div>
        ))}
      </div>
      {errors.map((e) => <p key={e} className="text-sm text-destructive">{e}</p>)}

      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={contribute} onChange={(e) => setContribute(e.target.checked)} className="mt-1" />
        Share my score anonymously (no name or contact) to improve slot-wise percentile estimates.
      </label>
      <Button onClick={calculate} disabled={errors.length > 0} size="lg" className="w-full rounded-xl py-6 text-base font-bold">Calculate Score &amp; Percentile</Button>

      {shown && (
        <div className="space-y-4 rounded-xl border border-primary/20 bg-card p-4 shadow-sm" aria-live="polite">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-primary p-3 text-primary-foreground"><p className="text-sm opacity-80">Total</p><p className="text-2xl font-bold tabular-nums">{total}</p><p className="text-sm opacity-80">/ {CAT_MAX_SCORE}</p></div>
            <div className="rounded-lg bg-muted/50 p-3"><p className="text-sm text-muted-foreground">Attempts</p><p className="text-2xl font-bold tabular-nums text-foreground">{attempted}</p><p className="text-sm text-muted-foreground">/ 68</p></div>
            <div className="rounded-lg bg-muted/50 p-3"><p className="text-sm text-muted-foreground">Accuracy</p><p className="text-2xl font-bold tabular-nums text-foreground">{attempted ? Math.round((correct / attempted) * 100) : 0}%</p></div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            {sections.map((s, i) => (
              <div key={s.section} className="rounded-lg border border-border p-2">
                <p className="font-semibold text-foreground">{s.section} <span className="text-primary">{s.score}</span></p>
                <p className="text-muted-foreground">{sectionBands[i]?.b ? `~${sectionBands[i].b!.estimate} %ile` : "Sectional %ile soon"}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-primary/5 p-3">
            <p className="text-sm text-muted-foreground">Estimated overall percentile (Slot {slot})</p>
            <p className="text-xl font-bold text-primary">{band ? `${band.low} – ${band.high}` : "—"}</p>
            <p className="mt-1 text-sm text-foreground">{percentileMeaning(band?.estimate ?? null)}</p>
          </div>
          <p className="flex gap-2 text-sm text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0" />
            This is an estimate. IIMs normalise raw scores across slots into scaled scores before percentiles are calculated{settings && !settings.overallVerified ? ", and our model currently uses indicative CAT 2025 data" : ""}.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={shareImage}><Share2 className="mr-1 h-4 w-4" /> Share my result</Button>
            <Button variant="outline" size="sm" onClick={copyLink}><Link2 className="mr-1 h-4 w-4" /> Copy link</Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link to="/iim-call-predictor" className="flex items-center justify-between rounded-lg border border-border p-3 text-sm font-semibold text-foreground hover:border-primary/40">Check your IIM call chances <ArrowRight className="h-4 w-4 text-primary" /></Link>
            <Link to="/colleges" search={{} as never} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm font-semibold text-foreground hover:border-primary/40">Find colleges for your percentile <ArrowRight className="h-4 w-4 text-primary" /></Link>
          </div>
          <Link to="/contact" className="block text-center text-sm text-primary underline">Want help with your shortlist? Get free counselling (optional)</Link>
        </div>
      )}
    </div>
  );
}
