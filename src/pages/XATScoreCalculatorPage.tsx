import React, { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Calculator, Upload, Globe, ClipboardPaste, Zap, XCircle, CheckCircle2, Shield, TrendingUp, HelpCircle, ArrowRight,
  ExternalLink, GraduationCap, Share2, Target, BookOpen, Trophy, TrendingDown, Brain, BrainCircuit, Award, ChevronDown, MinusCircle, Timer,
} from "lucide-react";
import CatDetailsDialog, { type CatContact } from "@/components/CatDetailsDialog";
import CatAlertSignup from "@/components/cat/CatAlertSignup";
import { SectionQuestionAnalysis } from "@/components/cat/QuestionwiseSections";
import { DeepAnalysis } from "@/components/cat/DeepAnalysis";
import XatManualCalculator from "@/components/xat/XatManualCalculator";
import { XatPercentileTable, XatCutoffTable, XatPatternTable, XatRelatedLinks, XatVideoSlot, XatStatusBanner } from "@/components/xat/XatWidgets";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cohortAverages } from "@/lib/catCohortAverages";
import { trackCatEvent } from "@/lib/catSettings";
import { useXatSettings } from "@/lib/xatSettings";
import { saveXatScoreSubmission } from "@/lib/xatScore.functions";
import type { XATResult } from "@/lib/xatParser";
import {
  XAT_SCHEME, XAT_GK_SCHEME, XAT_SECTION_LABELS, XAT_FREE_SKIPS, XAT_SKIP_PENALTY, DEFAULT_XAT_SETTINGS,
  xatPercentileBand, xatPercentileMeaning,
} from "@/lib/xatScoreEngine";
import { XAT_HUB_FAQS } from "@/lib/xatHubContent";

const STEPS_LOADING = ["Fetching response sheet...", "Identifying sections...", "Reading VALR answers...", "Reading Decision Making answers...",
  "Reading QA&DI answers...", "Reading GK answers...", "Applying XAT marking...", "Checking unattempted penalty...", "Estimating percentile...", "Building your report..."];

const HOW_TO = [
  { t: "Log in to xatonline.in", d: "Use your XAT ID and password." },
  { t: "Open the response sheet", d: "Click the candidate response or response sheet link. It opens on a digialm.com page." },
  { t: "Copy the page link", d: "Copy the full address from your browser bar and paste it above." },
  { t: "Link not working?", d: "Right-click → View Page Source (Ctrl+U), select all, copy and use the Paste Code tab, or save the page and upload it." },
];

const short = (k: string) => (k === "QADI" ? "QA&DI" : k);

const ResultHead = ({ index, title, sub }: { index: string; title: string; sub: string }) => (
  <div className="mb-3 flex items-end gap-3 border-b border-border pb-2">
    <span className="font-mono text-sm font-semibold text-primary">{index}</span>
    <div className="min-w-0"><h2 className="text-xl font-bold leading-tight text-foreground">{title}</h2><p className="text-sm text-muted-foreground">{sub}</p></div>
  </div>
);

const useXatLiveStats = () => useQuery({
  queryKey: ["xat-live-stats"],
  queryFn: async () => {
    const { data } = await supabase.rpc("xat_live_stats");
    const d = (data || {}) as { total?: number; scores?: number[]; sections?: Record<string, number | null> };
    const scores = (d.scores || []).map(Number).filter(Number.isFinite);
    return { total: d.total || 0, count: scores.length, highest: scores.length ? Math.max(...scores) : 0, tiers: cohortAverages(scores), sections: d.sections || {} };
  },
  staleTime: 60_000,
});

function ScoreScale({ you, max, stats }: { you: number; max: number; stats?: ReturnType<typeof useXatLiveStats>["data"] }) {
  const min = -10;
  const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))}%`;
  const has = (stats?.count ?? 0) > 0;
  const show = (v: number | null | undefined) => (has && v != null ? v : "—");
  const cells: [string, number | string, boolean][] = [
    ["Your score", you, true], ["Top 10% average", show(stats?.tiers.top10), false], ["Top 25% average", show(stats?.tiers.top25), false],
    ["Top 50% average", show(stats?.tiers.top50), false], ["Overall average", show(stats?.tiers.overall), false],
  ];
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
      <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
        {cells.map(([l, v, mine]) => (
          <div key={l} className={`rounded-lg p-2 ${mine ? "col-span-2 bg-primary/10 sm:col-span-1" : "bg-muted/50"}`}>
            <p className="text-sm text-muted-foreground">{l}</p><p className={`text-2xl font-bold tabular-nums ${mine ? "text-primary" : "text-foreground"}`}>{v}</p>
          </div>
        ))}
      </div>
      <div className="relative mx-2 mb-8 mt-10">
        <div className="h-2.5 rounded-full bg-gradient-to-r from-muted via-primary/30 to-primary" />
        {[0, 0.25, 0.5, 0.75, 1].map((f) => <span key={f} className="absolute top-4 -translate-x-1/2 text-sm tabular-nums text-muted-foreground" style={{ left: `${f * 100}%` }}>{Math.round(min + f * (max - min))}</span>)}
        {has && stats?.tiers.overall != null && (
          <div className="absolute -top-1 flex -translate-x-1/2 flex-col items-center" style={{ left: pos(stats.tiers.overall) }}>
            <span className="h-4.5 w-0.5 bg-muted-foreground" /><span className="absolute top-9 whitespace-nowrap rounded bg-muted px-1.5 text-sm text-muted-foreground">Avg {stats.tiers.overall}</span>
          </div>
        )}
        <div className="absolute -top-7 flex -translate-x-1/2 flex-col items-center" style={{ left: pos(you) }}>
          <span className="whitespace-nowrap rounded-md bg-primary px-2 py-0.5 text-sm font-semibold text-primary-foreground">You {you}</span>
          <span className="-mb-1 mt-1 h-3 w-3 rounded-full border-2 border-card bg-primary shadow" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{has ? `Based on ${stats!.count.toLocaleString()} XAT 2027 score calculations on MBA Compass${stats!.highest ? `; highest so far is ${stats!.highest}` : ""}. Updates automatically.` : "XAT 2027 aspirant averages will appear here automatically once calculations come in."}</p>
    </div>
  );
}

function Bars({ rows, max, suffix = "" }: { rows: { label: string; value: number; avg?: number | null }[]; max: number; suffix?: string }) {
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex justify-between text-sm"><span className="font-medium text-foreground">{r.label}</span><span className="tabular-nums text-muted-foreground">{r.value}{suffix}{r.avg != null ? ` · avg ${r.avg}${suffix}` : ""}</span></div>
          <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, (r.value / (max || 1)) * 100))}%` }} />
            {r.avg != null && <span className="absolute top-0 h-full w-0.5 bg-foreground/60" style={{ left: `${Math.max(0, Math.min(100, (r.avg / (max || 1)) * 100))}%` }} />}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function XATScoreCalculatorPage() {
  const [mode, setMode] = useState<"url" | "manual" | "paste" | "upload">("url");
  const [urlInput, setUrlInput] = useState("");
  const [htmlInput, setHtmlInput] = useState("");
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<XATResult | null>(null);
  const [pending, setPending] = useState<{ parsed: XATResult; url: string | null } | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const saveFn = useServerFn(saveXatScoreSubmission);
  const { data: live } = useXatLiveStats();
  const { data: settingsData } = useXatSettings();
  const settings = settingsData?.settings ?? DEFAULT_XAT_SETTINGS;

  const analyse = async (html: string, sheetUrl: string | null) => {
    setError(""); setLoading(true); setStep(0); setResult(null);
    trackCatEvent("calculator_started", { mode: "sheet", exam: "XAT" });
    for (let i = 0; i < STEPS_LOADING.length; i++) { setStep(i); await new Promise((r) => setTimeout(r, 160 + Math.random() * 120)); }
    try {
      const { parseXATResponseSheet } = await import("@/lib/xatParser");
      const parsed = parseXATResponseSheet(html);
      if (!parsed.questions.length) { setError("Could not read any questions from this response sheet. Check the link or paste the page source."); return; }
      setPending({ parsed, url: sheetUrl }); setShowDetails(true);
    } catch { setError("Failed to read the response sheet. Please check it and try again."); }
    finally { setLoading(false); }
  };

  const buildRow = (p: XATResult, url: string | null) => {
    const sec = (k: string) => p.score.sections.find((s) => s.key === k)?.score ?? null;
    return {
      application_no: p.applicationNo || null, test_date: p.testDate || null, test_time: p.testTime || null, response_sheet_url: url,
      total_score: p.score.part1.score, max_score: p.score.part1.maxScore, gk_score: p.score.gk?.score ?? null, unattempted_penalty: p.score.part1.penalty,
      total_questions: p.score.part1.total, attempted: p.score.part1.attempted, correct: p.score.part1.correct, incorrect: p.score.part1.incorrect,
      unattempted: p.score.part1.unattempted, accuracy: Math.round(p.score.part1.accuracy * 100) / 100,
      valr_score: sec("VALR"), dm_score: sec("DM"), qadi_score: sec("QADI"), sections_data: p.score.sections, questions_data: p.questions,
    };
  };

  const submitDetails = async (c: CatContact) => {
    if (!pending) return;
    await saveFn({ data: { name: c.name, email: c.email, phone: c.phone, row: buildRow(pending.parsed, pending.url) } });
    setResult({ ...pending.parsed, candidateName: c.name }); setPending(null);
    trackCatEvent("calculator_completed", { mode: "sheet", exam: "XAT", score: pending.parsed.score.part1.score });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const fetchUrl = useCallback(async () => {
    const link = urlInput.trim();
    if (!link) return setError("Please paste your XAT response sheet link.");
    try { new URL(link); } catch { return setError("Please paste a valid link starting with https://"); }
    setError(""); setFetching(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("fetch-response-sheet", { body: { url: link } });
      if (fnError || !data?.success) { setError(data?.error?.replace("CAT ", "") || "We could not open this link. It may have expired. Try pasting the page source instead."); return; }
      setFetching(false); await analyse(data.html, link);
    } catch { setError("We could not open this link. Try pasting the page source instead."); }
    finally { setFetching(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlInput]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader(); r.onload = (ev) => setHtmlInput(String(ev.target?.result || "")); r.readAsText(f);
  };

  const p1 = result?.score.part1;
  const band = p1 ? xatPercentileBand(settings.overall, p1.score) : null;
  const part1Qs = result ? result.questions.filter((q) => q.section !== "GK") : [];
  const gkQs = result ? result.questions.filter((q) => q.section === "GK") : [];

  const share = () => {
    if (!result || !p1) return;
    const text = `My XAT Score Report\nPart 1: ${p1.score}/${p1.maxScore}${band ? ` (est. ${band.low}–${band.high} percentile)` : ""}\n${result.score.sections.map((s) => `${short(s.key)}: ${s.score}`).join(" | ")}\n\nCalculate yours: ${window.location.href}`;
    trackCatEvent("share_clicked", { kind: "text", exam: "XAT" });
    if (navigator.share) navigator.share({ title: "My XAT Score", text }).catch(() => {});
    else { navigator.clipboard.writeText(text); toast.success("Copied to clipboard"); }
  };

  return (
    <div className="min-h-screen bg-background">
      <CatDetailsDialog open={showDetails} onOpenChange={setShowDetails} name={pending?.parsed.candidateName || ""}
        defaultEmail={user?.email || ""} defaultPhone={user?.user_metadata?.phone || ""} onSubmit={submitDetails} />

      {!result && !loading && (
        <section className="cat-score-pattern relative overflow-hidden border-b border-border">
          <div className="relative mx-auto max-w-3xl px-4 pb-8 pt-6 md:pb-10 md:pt-8">
            <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-sm font-semibold text-destructive">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" /></span>
                XAT 2027 Live
              </span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">Free • Instant • Skip penalty included</span>
            </div>
            <h1 className="text-center text-3xl font-bold tracking-tight text-foreground md:text-4xl">XAT 2027 Score Calculator <span className="text-primary">&amp; Percentile Predictor</span></h1>
            <p className="mt-2 text-center text-base text-muted-foreground">Paste your XAT response sheet link. Get your exact Part 1 score, VALR, DM, QA&amp;DI and GK breakdown and an estimated percentile.</p>

            <Card className="mt-5 rounded-2xl border border-primary/20 bg-card p-4 shadow-lg md:p-6">
              <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 sm:flex" role="tablist">
                {([["url", "Paste Link", Globe], ["manual", "Enter Manually", Calculator], ["paste", "Paste Code", ClipboardPaste], ["upload", "Upload File", Upload]] as const).map(([m, label, Icon]) => (
                  <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold transition-all ${mode === m ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    <Icon className="hidden h-4 w-4 sm:block" /> <span className="whitespace-nowrap">{label}</span>
                  </button>
                ))}
              </div>

              {mode === "url" ? (
                <form onSubmit={(e) => { e.preventDefault(); fetchUrl(); }} className="flex flex-col gap-3 md:flex-row">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://cdn3.digialm.com/...  paste your XAT response sheet link" aria-label="XAT response sheet link"
                      className="w-full rounded-xl border border-border bg-background py-4 pl-10 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <Button type="submit" disabled={!urlInput.trim() || fetching} size="lg" className="h-auto rounded-xl px-8 py-4 text-base font-bold shadow-md">
                    {fetching ? "Reading sheet..." : (<><Zap className="mr-2 h-5 w-5" /> Calculate My Score</>)}
                  </Button>
                </form>
              ) : mode === "manual" ? <XatManualCalculator /> : mode === "paste" ? (
                <div className="space-y-3">
                  <Textarea value={htmlInput} onChange={(e) => setHtmlInput(e.target.value)} placeholder="Open your response sheet → Right-click → View Page Source → Copy all → Paste here" className="min-h-[140px] rounded-xl border-border bg-background font-mono text-sm" />
                  <Button onClick={() => htmlInput.trim() ? analyse(htmlInput, null) : setError("Please paste the page source of your XAT response sheet.")} disabled={!htmlInput.trim()} size="lg" className="w-full rounded-xl py-6 text-base font-bold"><Calculator className="mr-2 h-5 w-5" /> Calculate My Score</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button type="button" onClick={() => fileRef.current?.click()} className="w-full rounded-xl border-2 border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                    <Upload className="mx-auto mb-2 h-8 w-8" />{htmlInput ? "File loaded. Click Calculate." : "Upload saved response sheet (.html)"}
                  </button>
                  <input ref={fileRef} type="file" accept=".html,.htm" onChange={onFile} className="hidden" />
                  <Button onClick={() => analyse(htmlInput, null)} disabled={!htmlInput.trim()} size="lg" className="w-full rounded-xl py-6 text-base font-bold"><Calculator className="mr-2 h-5 w-5" /> Calculate My Score</Button>
                </div>
              )}

              {error && <p className="mt-3 flex items-center gap-1 text-sm text-destructive"><XCircle className="h-4 w-4" /> {error}</p>}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-primary" /> Official XAT marking</span>
                <span className="inline-flex items-center gap-1"><Shield className="h-4 w-4 text-primary" /> Private &amp; secure</span>
                <span className="inline-flex items-center gap-1"><Timer className="h-4 w-4 text-primary" /> Skip penalty applied</span>
              </div>
            </Card>

            <details className="group mt-3 rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-foreground">
                <span className="inline-flex items-center gap-2"><HelpCircle className="h-4 w-4 text-primary" /> How to get your XAT response sheet link?</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                {HOW_TO.map((s, i) => <li key={s.t} className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{i + 1}</span><span><span className="font-semibold text-foreground">{s.t}:</span> {s.d}</span></li>)}
              </ol>
              <a href="https://xatonline.in" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary"><ExternalLink className="h-4 w-4" /> Open xatonline.in</a>
            </details>
            <div className="mt-3"><CatAlertSignup compact exam="XAT 2027" /></div>
          </div>
        </section>
      )}

      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="mx-auto max-w-lg px-4 py-16">
            <Card className="rounded-2xl border border-border bg-card p-10 text-center shadow-xl">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}><BrainCircuit className="mx-auto mb-5 h-14 w-14 text-primary" /></motion.div>
              <h3 className="mb-2 text-xl font-bold text-foreground">Analysing Your XAT Response Sheet</h3>
              <p className="mb-6 text-sm font-medium text-primary">{STEPS_LOADING[step]}</p>
              <Progress value={((step + 1) / STEPS_LOADING.length) * 100} className="mb-3 h-2.5" />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {result && p1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="cat-score-pattern pb-4">
          <section className="mx-auto max-w-5xl px-4 pt-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"><GraduationCap className="h-6 w-6 text-primary" /></div>
                <div><p className="text-lg font-bold text-foreground">{result.candidateName}</p><p className="text-sm text-muted-foreground">{result.subject} • {result.testDate} • {result.testTime}</p></div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={share}><Share2 className="mr-1 h-4 w-4" /> Share</Button>
                <Button variant="outline" size="sm" onClick={() => { setResult(null); setHtmlInput(""); }}>Calculate Again</Button>
              </div>
            </div>
          </section>

          <section className="mx-auto mb-6 max-w-5xl px-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: "Part 1 Score", value: p1.score, sub: `out of ${p1.maxScore}`, icon: Target, strong: true },
                { label: "Est. Percentile", value: band ? `${band.low}–${band.high}` : "—", sub: settings.overallVerified ? "verified model" : "indicative model", icon: TrendingUp },
                { label: "Accuracy", value: `${p1.accuracy.toFixed(1)}%`, sub: `${p1.correct}/${p1.correct + p1.incorrect} correct`, icon: CheckCircle2 },
                { label: "Skip Penalty", value: p1.penalty ? `−${p1.penalty}` : "0", sub: `${p1.unattempted} unattempted · ${XAT_FREE_SKIPS} free`, icon: MinusCircle },
              ].map((c) => (
                <div key={c.label} className={`rounded-xl border p-4 shadow-sm ${c.strong ? "border-primary/30 bg-primary text-primary-foreground" : "border-border bg-card"}`}>
                  <div className="flex items-center justify-between"><p className={`text-sm font-medium uppercase tracking-wider ${c.strong ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{c.label}</p><c.icon className={`h-4 w-4 ${c.strong ? "text-primary-foreground/80" : "text-primary"}`} /></div>
                  <p className={`mt-2 text-2xl font-bold tabular-nums md:text-4xl ${c.strong ? "" : "text-foreground"}`}>{c.value}</p>
                  <p className={`mt-1 text-sm ${c.strong ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{c.sub}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{xatPercentileMeaning(band?.estimate ?? null)}</p>
          </section>

          <section className="mx-auto mb-6 max-w-5xl px-4 md:mb-10">
            <ResultHead index="01" title="Complete Score Summary" sub="Every section scored on the official XAT marking, with the unattempted penalty" />
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"><div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/40">{["Section", "Total", "Attempted", "Correct", "Wrong", "Skipped", "Score", "Accuracy"].map((h, i) => <th key={h} className={`${i === 0 ? "px-4 text-left" : "px-3 text-center"} whitespace-nowrap py-2.5 text-sm font-medium uppercase tracking-wider text-muted-foreground`}>{h}</th>)}</tr></thead>
                <tbody>
                  {result.score.sections.filter((s) => s.key !== "GK").map((s) => (
                    <tr key={s.key} className="border-b border-border/60">
                      <td className="px-4 py-3 font-semibold text-foreground">{short(s.key)}</td>
                      {[s.total, s.attempted, s.correct, s.incorrect, s.unattempted].map((v, i) => <td key={i} className="px-3 py-3 text-center tabular-nums text-foreground">{v}</td>)}
                      <td className="px-3 py-3 text-center font-bold tabular-nums text-primary">{s.score}</td>
                      <td className="px-3 py-3 text-center tabular-nums text-foreground">{s.accuracy.toFixed(0)}%</td>
                    </tr>
                  ))}
                  <tr className="border-b border-border/60"><td className="px-4 py-3 text-muted-foreground" colSpan={6}>Unattempted penalty ({Math.max(0, p1.unattempted - XAT_FREE_SKIPS)} × {XAT_SKIP_PENALTY})</td><td className="px-3 py-3 text-center font-bold tabular-nums text-answer-wrong">{p1.penalty ? `−${p1.penalty}` : "0"}</td><td /></tr>
                  <tr className="bg-primary/5">
                    <td className="px-4 py-3 font-bold text-foreground">Part 1 total</td>
                    {[p1.total, p1.attempted, p1.correct, p1.incorrect, p1.unattempted].map((v, i) => <td key={i} className="px-3 py-3 text-center font-semibold tabular-nums text-foreground">{v}</td>)}
                    <td className="px-3 py-3 text-center text-xl font-bold tabular-nums text-primary">{p1.score}</td>
                    <td className="px-3 py-3 text-center font-semibold tabular-nums text-foreground">{p1.accuracy.toFixed(1)}%</td>
                  </tr>
                  {result.score.gk && (
                    <tr><td className="px-4 py-3 font-semibold text-foreground">GK <span className="font-normal text-muted-foreground">(not in percentile)</span></td>
                      {[result.score.gk.total, result.score.gk.attempted, result.score.gk.correct, result.score.gk.incorrect, result.score.gk.unattempted].map((v, i) => <td key={i} className="px-3 py-3 text-center tabular-nums text-muted-foreground">{v}</td>)}
                      <td className="px-3 py-3 text-center font-bold tabular-nums text-foreground">{result.score.gk.score}</td><td className="px-3 py-3 text-center tabular-nums text-muted-foreground">{result.score.gk.accuracy.toFixed(0)}%</td></tr>
                  )}
                </tbody>
              </table>
            </div></div>
          </section>

          <section className="mx-auto mb-6 max-w-5xl px-4 md:mb-10">
            <ResultHead index="02" title="Where You Stand" sub="Your Part 1 score against top 10%, top 25%, top 50% and overall averages of XAT 2027 aspirants on this calculator" />
            <ScoreScale you={p1.score} max={p1.maxScore || 76} stats={live} />
          </section>

          <section className="mx-auto mb-6 max-w-5xl px-4 md:mb-10">
            <ResultHead index="03" title="Section-wise Breakdown" sub="Attempts, accuracy and marks for VALR, Decision Making and QA&DI" />
            <SectionQuestionAnalysis questions={part1Qs} scheme={XAT_SCHEME} description="VALR, Decision Making and QA&DI · your marked answers against the response-sheet answer key" />
            {gkQs.length > 0 && (
              <div className="mt-5">
                <p className="mb-3 text-base font-semibold text-foreground">General Knowledge <span className="font-normal text-muted-foreground">· no negative marking, not counted in percentile</span></p>
                <SectionQuestionAnalysis questions={gkQs} scheme={XAT_GK_SCHEME} description="General Knowledge · your marked answers against the response-sheet answer key" />
              </div>
            )}
          </section>

          <section className="mx-auto mb-6 max-w-5xl px-4 md:mb-10">
            <ResultHead index="04" title="Skip Strategy Check" sub="XAT charges 0.10 for every unattempted Part 1 question after the first 8" />
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { t: "Free skips used", v: `${Math.min(p1.unattempted, XAT_FREE_SKIPS)} / ${XAT_FREE_SKIPS}`, d: p1.unattempted <= XAT_FREE_SKIPS ? "You stayed within the free limit." : "You used all free skips." },
                { t: "Penalised skips", v: Math.max(0, p1.unattempted - XAT_FREE_SKIPS), d: p1.penalty ? `These cost you ${p1.penalty} marks.` : "No marks lost to skipping." },
                { t: "Marks lost to wrong answers", v: Math.round(p1.incorrect * 0.25 * 100) / 100, d: `${p1.incorrect} wrong × 0.25. Each wrong answer costs more than a penalised skip.` },
              ].map((c) => <div key={c.t} className="rounded-xl border border-border bg-card p-4 shadow-sm"><p className="text-sm text-muted-foreground">{c.t}</p><p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{c.v}</p><p className="mt-1 text-sm text-muted-foreground">{c.d}</p></div>)}
            </div>
          </section>

          <section className="mx-auto mb-6 max-w-5xl px-4 md:mb-10">
            <ResultHead index="05" title="Deeper Analysis" sub="Passage and caselet-wise scores, review flags, option habits and marks lost" />
            <DeepAnalysis questions={part1Qs} scheme={XAT_SCHEME} />
          </section>

          <section className="mx-auto mb-6 max-w-5xl px-4 md:mb-10">
            <ResultHead index="06" title="Performance Insights" sub="Read directly from your response sheet" />
            <div className="grid gap-3 md:grid-cols-2">
              {(() => {
                const s = result.score.sections.filter((x) => x.key !== "GK");
                const best = [...s].sort((a, b) => b.accuracy - a.accuracy)[0], worst = [...s].sort((a, b) => a.accuracy - b.accuracy)[0];
                const rate = p1.total ? Math.round((p1.attempted / p1.total) * 100) : 0;
                return [
                  { icon: Trophy, t: "Strongest section", d: `${XAT_SECTION_LABELS[best.key]} at ${best.accuracy.toFixed(1)}% accuracy.` },
                  { icon: TrendingDown, t: "Needs improvement", d: `${XAT_SECTION_LABELS[worst.key]} at ${worst.accuracy.toFixed(1)}% accuracy. Focused practice here gives the biggest gain.` },
                  { icon: Shield, t: "Negative marking", d: `Wrong answers cost ${Math.round(p1.incorrect * 25) / 100} marks and skips cost ${p1.penalty}.` },
                  { icon: Brain, t: "Attempt strategy", d: `${rate}% of Part 1 attempted. ${p1.unattempted > XAT_FREE_SKIPS ? "Aim to leave no more than 8 questions blank." : "Good coverage; focus on accuracy now."}` },
                ].map((x) => (
                  <div key={x.t} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"><x.icon className="h-4 w-4 text-primary" /></span>
                    <div><p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{x.t}</p><p className="mt-1 text-sm text-foreground">{x.d}</p></div>
                  </div>
                ));
              })()}
            </div>
          </section>

          <section className="mx-auto mb-6 max-w-5xl px-4 md:mb-10">
            <ResultHead index="07" title="Visual Analysis" sub="Section scores against aspirant averages, and accuracy by section" />
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm"><p className="mb-3 text-base font-semibold text-foreground">Section score vs average</p>
                <Bars rows={result.score.sections.filter((s) => s.key !== "GK").map((s) => ({ label: short(s.key), value: s.score, avg: live?.count ? (live.sections[s.key] as number | null) ?? null : null }))} max={Math.max(...result.score.sections.map((s) => s.maxScore))} /></div>
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm"><p className="mb-3 text-base font-semibold text-foreground">Accuracy by section</p>
                <Bars rows={result.score.sections.map((s) => ({ label: short(s.key), value: Math.round(s.accuracy) }))} max={100} suffix="%" /></div>
            </div>
          </section>

          <section className="mx-auto mb-6 max-w-5xl px-4 md:mb-10">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-6"><Award className="mb-3 h-8 w-8 text-primary" /><h3 className="mb-2 text-lg font-bold text-foreground">Check your B-school fit</h3><p className="mb-4 text-sm text-muted-foreground">AI profile analysis with college predictions and strategy.</p><Link to="/tools/profile-analyzer"><Button>Analyse My Profile <ArrowRight className="ml-1 h-4 w-4" /></Button></Link></div>
              <div className="rounded-2xl border border-border bg-card p-6"><BookOpen className="mb-3 h-8 w-8 text-primary" /><h3 className="mb-2 text-lg font-bold text-foreground">Compare with XAT cut-offs</h3><p className="mb-4 text-sm text-muted-foreground">See XLRI and other XAT-accepting school cut-offs.</p><a href="/xat-cutoff-2027"><Button variant="outline">View cut-offs <ArrowRight className="ml-1 h-4 w-4" /></Button></a></div>
            </div>
          </section>
        </motion.div>
      )}

      <section className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:py-12">
        <XatStatusBanner />
        <div><h2 className="text-xl font-bold text-foreground">XAT score to percentile model</h2><p className="mb-3 mt-1 text-sm text-muted-foreground">The model this calculator uses. Values between points are interpolated.</p><XatPercentileTable /></div>
        <div><h2 className="text-xl font-bold text-foreground">Expected XAT 2027 cut-offs</h2><p className="mb-3 mt-1 text-sm text-muted-foreground">Overall and sectional minimums. Always confirm with each institute.</p><XatCutoffTable /></div>
        <div><h2 className="mb-3 text-xl font-bold text-foreground">XAT exam pattern and marking</h2><XatPatternTable /><p className="mt-2 text-sm text-muted-foreground">{settings.examDateNote}</p></div>
        <div><h2 className="mb-3 text-xl font-bold text-foreground">Video: find your XAT response sheet link</h2><XatVideoSlot /></div>
      </section>

      <section id="how-to-calculate-xat-score" className="mx-auto max-w-3xl space-y-8 px-4 py-8 md:py-12">
        <div>
          <h2 className="mb-3 text-2xl font-semibold tracking-tight text-foreground">How to Calculate Your XAT Score</h2>
          <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <p className="font-bold text-foreground">XAT score = Correct × 1 − Wrong × 0.25 − (Unattempted − 8) × 0.10</p>
            <p className="mt-1 text-sm text-muted-foreground">Applies to Part 1 (VALR, DM, QA&amp;DI). The skip term is never negative. GK is scored separately with no negative marking.</p>
          </div>
          <h3 className="mb-2 text-xl font-bold text-foreground">Worked example</h3>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="cat-table w-full">
              <thead><tr className="border-b border-border bg-primary/5"><th className="px-4 py-2.5 text-left">Section</th><th className="px-2 text-center">Correct</th><th className="px-2 text-center">Wrong</th><th className="px-2 text-center">Skipped</th><th className="px-4 text-center">Score</th></tr></thead>
              <tbody>
                {[["VALR", 16, 6, 4, 14.5], ["DM", 13, 5, 4, 11.75], ["QA&DI", 12, 6, 10, 10.5]].map(([s, c, w, u, sc]) => <tr key={s as string} className="border-b border-border"><td className="px-4 py-2.5 font-semibold">{s}</td><td className="text-center">{c}</td><td className="text-center">{w}</td><td className="text-center">{u}</td><td className="text-center font-bold">{sc}</td></tr>)}
                <tr className="border-b border-border"><td className="px-4 py-2.5" colSpan={4}>Skip penalty: 18 skipped − 8 free = 10 × 0.10</td><td className="text-center font-bold">−1</td></tr>
                <tr className="bg-primary/5 font-bold"><td className="px-4 py-2.5" colSpan={4}>Part 1 total</td><td className="text-center text-primary">35.75</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">A Part 1 score of about 35.75 has been close to the 98th–99th percentile on recent indicative data. Paste your response sheet above for your exact figure.</p>
        </div>
        <div>
          <h2 className="mb-3 text-2xl font-semibold tracking-tight text-foreground">What is XAT?</h2>
          <p className="text-base leading-relaxed text-muted-foreground">The Xavier Aptitude Test (XAT) is conducted by XLRI Jamshedpur for admission to XLRI and over 160 other B-schools. It is known for its Decision Making section, which tests judgement through business and ethical caselets, alongside Verbal &amp; Logical Ability and Quantitative Ability &amp; Data Interpretation. XAT is held in a single session, so there is no slot normalisation.</p>
        </div>
        <div>
          <h2 className="mb-3 text-2xl font-semibold tracking-tight text-foreground">What to Do After Calculating Your XAT Score</h2>
          <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed text-muted-foreground">
            <li><span className="font-semibold text-foreground">Check sectional scores:</span> XLRI applies sectional cut-offs, so a weak section matters.</li>
            <li><span className="font-semibold text-foreground">Shortlist schools:</span> compare your estimated percentile with the cut-off table above.</li>
            <li><span className="font-semibold text-foreground">Track deadlines:</span> see <Link to="/mba-application" className="text-primary underline">open MBA applications</Link>.</li>
            <li><span className="font-semibold text-foreground">Use your CAT score too:</span> many schools accept both. Try the <a href="/tools/cat-score-calculator" className="text-primary underline">CAT score calculator</a>.</li>
          </ul>
        </div>
      </section>

      <section className="bg-muted/30 py-8 md:py-14">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight text-foreground">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {XAT_HUB_FAQS.map((f) => (
              <details key={f.q} className="group rounded-xl border border-border bg-card shadow-xs">
                <summary className="flex cursor-pointer items-center justify-between rounded-xl px-5 py-4 hover:bg-muted/30"><span className="pr-4 text-sm font-semibold text-foreground">{f.q}</span><ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
                <p className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        <h2 className="mb-3 text-xl font-bold text-foreground">XAT 2027 tools and guides</h2>
        <XatRelatedLinks exclude="/tools/xat-score-calculator" />
        {(settings.lastUpdated || settingsData?.updatedAt) && <p className="mt-4 text-sm text-muted-foreground">Last updated: {new Date(settings.lastUpdated || settingsData!.updatedAt!).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "long" })}</p>}
      </section>
    </div>
  );
}
