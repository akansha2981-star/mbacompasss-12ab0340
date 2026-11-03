import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Share2, ArrowRight, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  XAT_SECTION_LABELS, XAT_FREE_SKIPS, scoreXatManual, validateXatSection, xatPercentileBand, xatPercentileMeaning,
  DEFAULT_XAT_SETTINGS, type XatSectionKey, type XatManualInput,
} from "@/lib/xatScoreEngine";
import { useXatSettings } from "@/lib/xatSettings";
import { trackCatEvent } from "@/lib/catSettings";

const KEYS: XatSectionKey[] = ["VALR", "DM", "QADI", "GK"];
const empty = (): XatManualInput => ({ correct: 0, wrong: 0 });

export default function XatManualCalculator() {
  const settings = useXatSettings().data?.settings ?? DEFAULT_XAT_SETTINGS;
  const [inputs, setInputs] = useState<Record<XatSectionKey, XatManualInput>>({ VALR: empty(), DM: empty(), QADI: empty(), GK: empty() });
  const [shown, setShown] = useState(false);
  const [started, setStarted] = useState(false);
  const [contribute, setContribute] = useState(true);

  const errors = KEYS.map((k) => validateXatSection(k, inputs[k], settings.pattern[k])).filter(Boolean) as string[];
  const r = scoreXatManual(inputs, settings.pattern);
  const band = useMemo(() => xatPercentileBand(settings.overall, r.total), [settings, r.total]);

  const set = (k: XatSectionKey, f: keyof XatManualInput, v: string) => {
    if (!started) { setStarted(true); trackCatEvent("calculator_started", { mode: "manual", exam: "XAT" }); }
    setShown(false);
    setInputs((p) => ({ ...p, [k]: { ...p[k], [f]: Math.max(0, Math.min(99, parseInt(v || "0", 10) || 0)) } }));
  };

  const calculate = async () => {
    if (errors.length) return;
    setShown(true);
    trackCatEvent("calculator_completed", { mode: "manual", exam: "XAT", score: r.total });
    if (contribute) {
      await supabase.from("xat_score_aggregates").insert({
        total_score: r.total, valr_score: r.sections[0].score, dm_score: r.sections[1].score, qadi_score: r.sections[2].score, gk_score: r.gk.score, source: "manual",
      });
    }
  };

  const share = () => {
    trackCatEvent("share_clicked", { kind: "text", exam: "XAT" });
    const text = `My XAT 2027 score: ${r.total} / ${r.max}${band ? ` (est. ${band.low}–${band.high} percentile)` : ""}. Calculate yours: ${window.location.origin}/tools/xat-score-calculator`;
    if (navigator.share) navigator.share({ title: "My XAT score", text }).catch(() => {});
    else { navigator.clipboard.writeText(text); toast.success("Copied to clipboard"); }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {KEYS.map((k) => (
          <fieldset key={k} className="rounded-xl border border-border bg-background p-3">
            <legend className="px-1 text-sm font-semibold text-foreground">{XAT_SECTION_LABELS[k]} <span className="font-normal text-muted-foreground">· {settings.pattern[k]} Qs{k === "GK" ? " · not in percentile" : ""}</span></legend>
            <div className="grid grid-cols-2 gap-2">
              {(["correct", "wrong"] as const).map((f) => (
                <label key={f} className="block">
                  <span className="text-sm text-muted-foreground">{f === "correct" ? "Correct" : "Wrong"}</span>
                  <input type="number" inputMode="numeric" min={0} max={settings.pattern[k]} value={inputs[k][f] || ""} placeholder="0"
                    onChange={(e) => set(k, f, e.target.value)} aria-label={`${XAT_SECTION_LABELS[k]} ${f}`}
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-base tabular-nums text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20" />
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      {errors.length > 0 && <ul className="space-y-1 text-sm text-destructive">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={contribute} onChange={(e) => setContribute(e.target.checked)} className="mt-1" />
        <span>Add my score anonymously to improve XAT averages. No name or contact details are saved.</span>
      </label>
      <Button onClick={calculate} disabled={errors.length > 0} size="lg" className="w-full rounded-xl py-6 text-base font-bold">Calculate XAT Score</Button>

      {shown && (
        <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div><p className="text-sm text-muted-foreground">Part 1 score</p><p className="text-2xl font-bold tabular-nums text-primary">{r.total}<span className="text-sm font-normal text-muted-foreground"> / {r.max}</span></p></div>
            <div><p className="text-sm text-muted-foreground">Estimated percentile</p><p className="text-2xl font-bold tabular-nums text-foreground">{band ? `${band.low}–${band.high}` : "—"}</p></div>
            <div><p className="text-sm text-muted-foreground">Skip penalty</p><p className="text-2xl font-bold tabular-nums text-foreground">{r.penalty ? `−${r.penalty}` : "0"}</p></div>
            <div><p className="text-sm text-muted-foreground">GK (separate)</p><p className="text-2xl font-bold tabular-nums text-foreground">{r.gk.score}</p></div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {r.sections.map((s) => <div key={s.key} className="rounded-lg border border-border bg-card p-3"><p className="text-sm font-semibold text-foreground">{s.key === "QADI" ? "QA&DI" : s.key}</p><p className="text-sm text-muted-foreground">{s.correct} right · {s.wrong} wrong · {s.unattempted} skipped</p><p className="mt-1 text-xl font-bold tabular-nums text-primary">{s.score}</p></div>)}
          </div>
          <p className="flex gap-2 text-sm text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{r.unattempted} Part 1 questions unattempted; the first {XAT_FREE_SKIPS} are free. {xatPercentileMeaning(band?.estimate ?? null)}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={share}><Share2 className="mr-1 h-4 w-4" /> Share</Button>
            <Button asChild variant="outline" size="sm"><Link to="/xat-cutoff-2027">Compare with cut-offs <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </div>
        </div>
      )}
    </div>
  );
}
