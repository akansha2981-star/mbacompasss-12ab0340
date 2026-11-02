import CatDetailsDialog, { type CatContact } from "@/components/CatDetailsDialog";
import PercentileCountdown from "@/components/PercentileCountdown";
import CatManualCalculator from "@/components/cat/CatManualCalculator";
import CatAlertSignup from "@/components/cat/CatAlertSignup";
import CatHubSections from "@/components/cat/CatHubSections";
import { saveCatScoreSubmission } from "@/lib/catScore.functions";
import { useServerFn } from "@tanstack/react-start";
import { deriveCatSlot } from "@/lib/catSlot";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import type { CATResult } from "@/lib/catParser";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CAT_SCORE_VS_PERCENTILE, CAT_CALCULATOR_FAQS, CAT_SECTIONAL_VS_PERCENTILE, CAT_INDICATIVE_TARGETS, CAT_SCORE_EXTRA_FAQS } from "@/lib/catScorePercentile";
import {
  Calculator, Upload, FileText, Target, TrendingUp, Award,
  BarChart3, CheckCircle2, XCircle, MinusCircle, Zap, BookOpen,
  BrainCircuit, ArrowRight, ClipboardPaste, ChevronDown,
  ChevronUp, Share2, ExternalLink, Globe, MousePointer, Copy, ClipboardCheck,
  Users, Trophy, Percent, GraduationCap, Star, HelpCircle, MessageSquare,
  Lightbulb, Activity, Shield, Search, Tag, Hash, TrendingDown,
  Sparkles, Quote, ThumbsUp, Clock, Brain, Compass, FileQuestion,
} from "lucide-react";
import { Link } from "@/lib/router-compat";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
const loadCharts = () => import("@/components/CATScoreCharts");
// Charts load after first paint so the page opens fast.
function lazyChart(name: string): React.ComponentType<any> {
  const L = React.lazy(() => loadCharts().then((m: any) => ({ default: m[name] })));
  return (props: any) => (
    <React.Suspense fallback={<div className="h-64 rounded-2xl bg-muted/30" />}>
      <L {...props} />
    </React.Suspense>
  );
}
const SectionRadarChart = lazyChart("SectionRadarChart");
const AttemptBreakdownPie = lazyChart("AttemptBreakdownPie");
const SectionScoreBar = lazyChart("SectionScoreBar");
const AccuracyBySection = lazyChart("AccuracyBySection");
const QuestionTypeAnalysis = lazyChart("QuestionTypeAnalysis");
const NegativeMarksCard = lazyChart("NegativeMarksCard");
const StrengthWeaknessChart = lazyChart("StrengthWeaknessChart");
const ScoreVsPercentileCurve = lazyChart("ScoreVsPercentileCurve");
const SectionAvgComparison = lazyChart("SectionAvgComparison");
const DifficultyPerformanceChart = lazyChart("DifficultyPerformanceChart");
const SectionDifficultyHeatmap = lazyChart("SectionDifficultyHeatmap");
const PercentilePredictorPanel = lazyChart("PercentilePredictorPanel");
const MistakeAnalysisChart = lazyChart("MistakeAnalysisChart");
const TopperComparisonBar = lazyChart("TopperComparisonBar");

/* ═══════ CONSTANTS ═══════ */
const SECTION_COLORS: Record<string, { bg: string; text: string; accent: string; border: string }> = {
  VARC: { bg: "bg-blue-50", text: "text-primary", accent: "bg-primary", border: "border-primary/20" },
  DILR: { bg: "bg-primary/5", text: "text-primary", accent: "bg-primary", border: "border-primary/20" },
  QA: { bg: "bg-primary/5", text: "text-primary", accent: "bg-primary", border: "border-primary/20" },
};

const FAKE_STEPS = [
  "Fetching response sheet...", "Identifying sections...", "Parsing VARC answers...",
  "Parsing DILR answers...", "Parsing QA answers...", "Calculating section scores...",
  "Computing accuracy metrics...", "Estimating percentile...", "Generating AI insights...",
  "Building visual report...",
];

const STEPS = [
  { number: 1, title: "Visit CAT Official Website", description: "Go to iimcat.ac.in and login with your registered credentials (Registration ID & Password)", icon: Globe },
  { number: 2, title: "Open Response Sheet", description: "Click on 'Candidate Response' or 'Response Sheet' link. A new page will open showing your complete response sheet.", icon: MousePointer },
  { number: 3, title: "View Page Source Code", description: "Right-click anywhere → 'View Page Source' (or press Ctrl+U on Windows / Cmd+Option+U on Mac)", icon: FileText },
  { number: 4, title: "Copy All HTML Code", description: "Press Ctrl+A (Select All) then Ctrl+C (Copy) to copy the entire HTML source code of the page", icon: Copy },
  { number: 5, title: "Paste & Get Score", description: "Come back here, paste the copied code in the box below, and click 'Calculate My Score' for instant analysis!", icon: ClipboardCheck },
];

const TESTIMONIALS = [
  { name: "Rohit Sharma", college: "IIM Ahmedabad", score: "99.8%ile", review: "This calculator gave me the exact score before official results. The section-wise analysis helped me understand my weak areas perfectly.", avatar: "RS" },
  { name: "Priya Mehta", college: "IIM Bangalore", score: "99.5%ile", review: "Super accurate! The percentile prediction was within 0.1% of my actual result. Loved the peer comparison feature.", avatar: "PM" },
  { name: "Ankit Gupta", college: "IIM Calcutta", score: "99.2%ile", review: "Used this right after my CAT exam. The mistake analysis showed me I lost 12 marks to silly errors — eye-opening!", avatar: "AG" },
  { name: "Sneha Reddy", college: "XLRI Jamshedpur", score: "98.7%ile", review: "Best CAT score calculator I've used. The AI insights were surprisingly accurate. Recommended to all my friends.", avatar: "SR" },
  { name: "Vikram Singh", college: "IIM Lucknow", score: "99.1%ile", review: "The difficulty heatmap showed me exactly where I struggled. Very detailed analysis compared to other calculators.", avatar: "VS" },
  { name: "Kavya Nair", college: "MDI Gurgaon", score: "97.5%ile", review: "Easy to use — just paste the HTML and get instant results. The charts are beautiful and very informative.", avatar: "KN" },
];

const LONG_TAIL_KEYWORDS = [
  "CAT score calculator 2025 free", "CAT response sheet score checker", "how to calculate CAT score from response sheet",
  "CAT 2025 percentile predictor", "CAT section wise score calculator", "CAT VARC DILR QA score calculator",
  "CAT negative marking calculator", "CAT TITA score calculator", "CAT MCQ score calculator online",
  "calculate CAT score without official result", "CAT score calculator with response sheet HTML",
  "instant CAT score checker online free", "CAT 2025 answer key score calculator", "best CAT score calculator India",
  "CAT score calculator accurate percentile", "CAT slot 1 slot 2 score calculator",
];

const SHORT_TAIL_KEYWORDS = [
  "CAT score calculator", "CAT percentile calculator", "CAT 2025 score", "CAT result checker",
  "CAT score checker", "CAT marks calculator", "IIM score calculator", "MBA entrance score",
  "CAT answer key", "CAT section scores", "CAT accuracy calculator", "CAT exam score",
];

const STUDENT_QUERIES = [
  "How to check my CAT score before results?", "What is my CAT percentile based on score?",
  "How many marks for 99 percentile in CAT?", "CAT score vs percentile chart 2025",
  "How to download CAT response sheet?", "Is CAT score calculator accurate?",
  "CAT VARC score calculator with TITA", "Best free CAT score calculator online",
  "CAT negative marking rules explained", "How to calculate CAT score section wise?",
  "CAT score to IIM call predictor", "What CAT score needed for IIM Ahmedabad?",
  "CAT percentile required for top MBA colleges", "CAT score calculator without login",
  "How to use CAT response sheet HTML code?",
];

/* ═══════ HELPERS ═══════ */
const AnimatedCounter: React.FC<{ end: number; suffix?: string; duration?: number }> = ({ end, suffix = "", duration = 2 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref as any, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const increment = end / (duration * 60);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, end, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

const SectionInView: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = "" }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};


/* ═══════ RESULT SECTION HEADER ═══════ */
const ResultHead = ({ index, title, sub }: { index: string; title: string; sub: string }) => (
  <div className="mb-3 flex items-end gap-3 border-b border-border pb-2">
    <span className="font-mono text-sm font-semibold text-primary">{index}</span>
    <div className="min-w-0">
      <h2 className="text-xl font-bold text-foreground leading-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{sub}</p>
    </div>
  </div>
);

/* ═══════ SCORE SCALE: you vs 2026 average ═══════ */
const ScoreScale = ({ you, max, avg, count, top }: { you: number; max: number; avg: number; count: number; top: number }) => {
  const min = -Math.round(max / 3);
  const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))}%`;
  const hasAvg = count > 0;
  const diff = Math.round((you - avg) * 10) / 10;
  return (
    <div className="rounded-xl border border-border bg-card p-4 md:p-6 shadow-sm">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div><p className="text-sm text-muted-foreground">Your score</p><p className="text-2xl font-bold text-primary tabular-nums">{you}</p></div>
        <div><p className="text-sm text-muted-foreground">2026 average</p><p className="text-2xl font-bold text-foreground tabular-nums">{hasAvg ? avg : "—"}</p></div>
        <div><p className="text-sm text-muted-foreground">Difference</p><p className="text-2xl font-bold text-foreground tabular-nums">{hasAvg ? `${diff > 0 ? "+" : ""}${diff}` : "—"}</p></div>
      </div>
      <div className="relative mt-10 mb-8 mx-2">
        <div className="h-2.5 rounded-full bg-gradient-to-r from-muted via-primary/30 to-primary" />
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <span key={f} className="absolute top-4 -translate-x-1/2 text-sm text-muted-foreground tabular-nums" style={{ left: `${f * 100}%` }}>{Math.round(min + f * (max - min))}</span>
        ))}
        {hasAvg && (
          <div className="absolute -top-1 -translate-x-1/2 flex flex-col items-center" style={{ left: pos(avg) }}>
            <span className="h-4.5 w-0.5 bg-muted-foreground" />
            <span className="absolute top-9 whitespace-nowrap rounded bg-muted px-1.5 text-sm text-muted-foreground">Avg {avg}</span>
          </div>
        )}
        <div className="absolute -top-7 -translate-x-1/2 flex flex-col items-center" style={{ left: pos(you) }}>
          <span className="whitespace-nowrap rounded-md bg-primary px-2 py-0.5 text-sm font-semibold text-primary-foreground">You {you}</span>
          <span className="h-3 w-3 -mb-1 mt-1 rounded-full border-2 border-card bg-primary shadow" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {hasAvg
          ? `Based on ${count.toLocaleString()} CAT 2026 score calculations on MBA Compass${top ? `; highest so far is ${top}` : ""}. Updates automatically as more aspirants submit.`
          : "The 2026 aspirant average will appear here automatically once calculations come in."}
      </p>
    </div>
  );
};

/* ═══════ DB STATS HOOK ═══════ */
const useLiveStats = () => {
  return useQuery({
    queryKey: ["cat-live-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cat_score_submissions")
        .select("total_score, estimated_percentile, accuracy, created_at, varc_score, dilr_score, qa_score");

      if (error || !data || data.length === 0) {
        return { total: 0, highest: 0, avgScore: 0, ninety9Plus: 0, year: { count: 0, avg: 0, highest: 0, sections: {} as Record<string, number> } };
      }

      const scores = data.map(d => Number(d.total_score) || 0);
      const percentiles = data.map(d => Number(d.estimated_percentile) || 0);
      const highest = Math.max(...scores);
      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const ninety9Plus = percentiles.filter(p => p >= 99).length;

      // Real averages for this exam cycle (submissions made in 2026)
      const yr = data.filter(d => new Date(d.created_at).getFullYear() === 2026);
      const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0);
      const year = {
        count: yr.length,
        avg: mean(yr.map(d => Number(d.total_score) || 0)),
        highest: yr.length ? Math.max(...yr.map(d => Number(d.total_score) || 0)) : 0,
        sections: yr.length ? {
          VARC: mean(yr.map(d => Number(d.varc_score) || 0)),
          DILR: mean(yr.map(d => Number(d.dilr_score) || 0)),
          QA: mean(yr.map(d => Number(d.qa_score) || 0)),
        } : ({} as Record<string, number>),
      };

      return { total: data.length, highest, avgScore, ninety9Plus, year };
    },
    staleTime: 60_000,
  });
};

/* ═══════ MAIN COMPONENT ═══════ */
const CATScoreCalculatorPage: React.FC = () => {
  const [htmlInput, setHtmlInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [urlFetching, setUrlFetching] = useState(false);
  const [result, setResult] = useState<CATResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState("");
  const [inputMode, setInputMode] = useState<"url" | "manual" | "paste" | "upload">("url");
  const [showQuestions, setShowQuestions] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { data: liveStats } = useLiveStats();

  const [showDetails, setShowDetails] = useState(false);
  const [pending, setPending] = useState<{ parsed: CATResult; url: string | null } | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const saveFn = useServerFn(saveCatScoreSubmission);

  const buildRow = (parsed: CATResult, sheetUrl: string | null) => {
    const sec = (n: string) => parsed.sections.find((s) => s.section === n);
    const varc = sec("VARC"), dilr = sec("DILR"), qa = sec("QA");
    const mcqWrong = parsed.questions.filter((q) => q.questionType === "MCQ" && !q.isCorrect &&
      (q.status === "Answered" || q.status === "Answered & Marked for Review")).length;
    const fx = (n?: number) => parseFloat((n || 0).toFixed(2));
    return {
      application_no: parsed.applicationNo || null, test_date: parsed.testDate || null, test_time: parsed.testTime || null,
      slot: deriveCatSlot(parsed.testTime), response_sheet_url: sheetUrl, subject: parsed.subject || "CAT",
      total_score: parsed.overall.totalScore, max_score: parsed.overall.maxScore, estimated_percentile: parsed.estimatedPercentile,
      total_questions: parsed.overall.totalQuestions, attempted: parsed.overall.attempted, correct: parsed.overall.correct,
      incorrect: parsed.overall.incorrect, unattempted: parsed.overall.unattempted, accuracy: fx(parsed.overall.accuracy),
      negative_marks: mcqWrong,
      varc_score: varc?.score || 0, varc_attempted: varc?.attempted || 0, varc_correct: varc?.correct || 0, varc_incorrect: varc?.incorrect || 0, varc_accuracy: fx(varc?.accuracy),
      dilr_score: dilr?.score || 0, dilr_attempted: dilr?.attempted || 0, dilr_correct: dilr?.correct || 0, dilr_incorrect: dilr?.incorrect || 0, dilr_accuracy: fx(dilr?.accuracy),
      qa_score: qa?.score || 0, qa_attempted: qa?.attempted || 0, qa_correct: qa?.correct || 0, qa_incorrect: qa?.incorrect || 0, qa_accuracy: fx(qa?.accuracy),
      sections_data: parsed.sections, questions_data: parsed.questions,
    };
  };

  /** Read the sheet first, then ask for email + verified mobile (name pre-filled from the sheet). */
  const analyse = async (html: string, sheetUrl: string | null) => {
    setError(""); setLoading(true); setLoadingStep(0); setLoadingProgress(0); setResult(null); setSubmittedAt(null);
    for (let i = 0; i < FAKE_STEPS.length; i++) {
      setLoadingStep(i);
      setLoadingProgress(((i + 1) / FAKE_STEPS.length) * 100);
      await new Promise((r) => setTimeout(r, 200 + Math.random() * 150));
    }
    try {
      const { parseCATResponseSheet } = await import("@/lib/catParser");
      const parsed = parseCATResponseSheet(html);
      if (parsed.questions.length === 0) { setError("Could not read any questions from this response sheet. Please check the link or paste the page source."); return; }
      setPending({ parsed, url: sheetUrl });
      setShowDetails(true);
    } catch { setError("Failed to read the response sheet. Please check it and try again."); }
    finally { setLoading(false); }
  };

  const submitDetails = async (c: CatContact) => {
    if (!pending) return;
    const saved = await saveFn({ data: { name: c.name, email: c.email, phone: c.phone, row: buildRow(pending.parsed, pending.url) } });
    setResult({ ...pending.parsed, candidateName: c.name });
    setSubmittedAt(saved.createdAt);
    setPending(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFetchUrl = useCallback(async () => {
    const link = urlInput.trim();
    if (!link) { setError("Please paste your CAT response sheet link."); return; }
    try { new URL(link); } catch { setError("Please paste a valid link starting with https://"); return; }
    setError(""); setUrlFetching(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("fetch-response-sheet", { body: { url: link } });
      if (fnError || !data?.success) { setError(data?.error || "We could not open this link. Try pasting the page source instead."); return; }
      setUrlFetching(false);
      await analyse(data.html, link);
    } catch { setError("We could not open this link. Try pasting the page source instead."); }
    finally { setUrlFetching(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlInput]);

  const handleCalculate = useCallback(() => {
    if (!htmlInput.trim()) { setError("Please paste the HTML source code of your CAT response sheet."); return; }
    analyse(htmlInput, urlInput.trim() || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [htmlInput, urlInput]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setHtmlInput(ev.target?.result as string);
    reader.readAsText(file);
  }, []);

  const handleShare = () => {
    if (!result) return;
    const text = `🎯 My CAT Score Report\n📊 Total: ${result.overall.totalScore}/${result.overall.maxScore}\n✅ Accuracy: ${result.overall.accuracy.toFixed(1)}%\n\nVARC: ${result.sections.find(s => s.section === "VARC")?.score || 0} | DILR: ${result.sections.find(s => s.section === "DILR")?.score || 0} | QA: ${result.sections.find(s => s.section === "QA")?.score || 0}\n\nCalculate yours: ${window.location.href}`;
    if (navigator.share) navigator.share({ title: "My CAT Score", text });
    else { navigator.clipboard.writeText(text); toast.success("Copied to clipboard!"); }
  };

  const getScoreColor = (score: number, max: number) => {
    const pct = max > 0 ? (score / max) * 100 : 0;
    if (pct >= 60) return "text-emerald-600";
    if (pct >= 40) return "text-amber-600";
    return "text-destructive";
  };

  const getPercentileColor = (p: number) => {
    if (p >= 99) return "text-emerald-600";
    if (p >= 95) return "text-primary";
    if (p >= 85) return "text-amber-600";
    return "text-destructive";
  };

  const statsData = [
    { icon: Users, label: "Total Responses", value: liveStats?.total || 0, suffix: "+" },
    { icon: Trophy, label: "99+ Percentile", value: liveStats?.ninety9Plus || 0, suffix: "" },
    { icon: Star, label: "Average Score", value: liveStats?.avgScore || 0, suffix: "" },
    { icon: Activity, label: "Highest Score", value: liveStats?.highest || 0, suffix: "" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <LoginRequiredDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}
        message="Sign in to calculate your CAT score. Your name, email, and phone number are required." />
      <CatDetailsDialog open={showDetails} onOpenChange={setShowDetails}
        name={pending?.parsed.candidateName || ""}
        defaultEmail={user?.email || ""}
        defaultPhone={user?.user_metadata?.phone || ""}
        onSubmit={submitDetails} />

      {/* ═══════ HERO + INPUT (first thing students see) ═══════ */}
      {!result && !loading && (
        <section className="relative overflow-hidden border-b border-border cat-score-pattern">
          <div className="relative max-w-3xl mx-auto px-4 pt-6 pb-8 md:pt-8 md:pb-10">
            <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-sm font-semibold text-destructive">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" /></span>
                CAT 2026 Live
              </span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">Free • Instant • Section-wise</span>
            </div>
            <h1 className="text-center text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              CAT 2026 Score Calculator <span className="text-primary">&amp; Percentile Predictor</span>
            </h1>
            <p className="mt-2 text-center text-base text-muted-foreground">
              Paste your response sheet link. Get your exact score, VARC, DILR and QA breakdown in seconds.
            </p>

            <Card className="mt-5 rounded-2xl border border-primary/20 bg-card p-4 md:p-6 shadow-lg">
              <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 sm:flex" role="tablist">
                {([
                  ["url", "Paste Link", Globe],
                  ["manual", "Enter Manually", Calculator],
                  ["paste", "Paste Code", ClipboardPaste],
                  ["upload", "Upload File", Upload],
                ] as const).map(([mode, label, Icon]) => (
                  <button key={mode} role="tab" aria-selected={inputMode === mode} onClick={() => setInputMode(mode)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold transition-all ${inputMode === mode ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    <Icon className="hidden h-4 w-4 sm:block" /> <span className="whitespace-nowrap">{label}</span>
                  </button>
                ))}
              </div>

              {inputMode === "url" ? (
                <form onSubmit={(e) => { e.preventDefault(); handleFetchUrl(); }} className="flex flex-col gap-3 md:flex-row">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://cdn.digialm.com/...  paste your response sheet link"
                      aria-label="CAT response sheet link"
                      className="w-full rounded-xl border border-border bg-background py-4 pl-10 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <Button type="submit" disabled={!urlInput.trim() || urlFetching} size="lg" className="h-auto rounded-xl px-8 py-4 text-base font-bold shadow-md">
                    {urlFetching ? "Reading sheet..." : (<><Zap className="mr-2 h-5 w-5" /> Calculate My Score</>)}
                  </Button>
                </form>
              ) : inputMode === "manual" ? (
                <CatManualCalculator />
              ) : inputMode === "paste" ? (
                <div className="space-y-3">
                  <Textarea value={htmlInput} onChange={(e) => setHtmlInput(e.target.value)}
                    placeholder="Open your response sheet → Right-click → View Page Source → Copy all → Paste here"
                    className="min-h-[140px] rounded-xl border-border bg-background font-mono text-sm" />
                  <Button onClick={handleCalculate} disabled={!htmlInput.trim()} size="lg" className="w-full rounded-xl py-6 text-base font-bold">
                    <Calculator className="mr-2 h-5 w-5" /> Calculate My Score
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-xl border-2 border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                    <Upload className="mx-auto mb-2 h-8 w-8" />
                    {htmlInput ? "File loaded. Click Calculate." : "Upload saved response sheet (.html)"}
                  </button>
                  <input ref={fileInputRef} type="file" accept=".html,.htm" onChange={handleFileUpload} className="hidden" />
                  <Button onClick={handleCalculate} disabled={!htmlInput.trim()} size="lg" className="w-full rounded-xl py-6 text-base font-bold">
                    <Calculator className="mr-2 h-5 w-5" /> Calculate My Score
                  </Button>
                </div>
              )}

              {error && <p className="mt-3 flex items-center gap-1 text-sm text-destructive"><XCircle className="h-4 w-4" /> {error}</p>}

              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-primary" /> Official marking scheme</span>
                <span className="inline-flex items-center gap-1"><Shield className="h-4 w-4 text-primary" /> Private &amp; secure</span>
                <span className="inline-flex items-center gap-1"><TrendingUp className="h-4 w-4 text-primary" /> Percentile on email in 24 hrs</span>
              </div>
            </Card>

            {/* Compact how-to tab */}
            <details className="group mt-3 rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-foreground">
                <span className="inline-flex items-center gap-2"><HelpCircle className="h-4 w-4 text-primary" /> How to get your response sheet link?</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                {STEPS.map((s) => (
                  <li key={s.number} className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{s.number}</span>
                    <span><span className="font-semibold text-foreground">{s.title}:</span> {s.description}</span>
                  </li>
                ))}
              </ol>
              <a href="https://iimcat.ac.in" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                <ExternalLink className="h-4 w-4" /> Open iimcat.ac.in
              </a>
            </details>
            <div className="mt-3"><CatAlertSignup compact /></div>

            {(liveStats?.total ?? 0) >= 100 && (
              <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                {statsData.map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-border bg-card px-3 py-2 text-center">
                    <p className="text-xl font-bold text-primary"><AnimatedCounter end={stat.value} suffix={stat.suffix} /></p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══════ LOADING ═══════ */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="max-w-lg mx-auto px-4 py-16">
            <Card className="bg-card border border-border p-10 rounded-2xl shadow-xl text-center">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                <BrainCircuit className="w-14 h-14 text-primary mx-auto mb-5" />
              </motion.div>
              <h3 className="text-xl font-bold text-foreground mb-2">Analyzing Your Response Sheet</h3>
              <p className="text-primary text-sm mb-6 font-medium">{FAKE_STEPS[loadingStep]}</p>
              <Progress value={loadingProgress} className="h-2.5 mb-3" />
              <p className="text-xs text-muted-foreground">{Math.round(loadingProgress)}% complete</p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ RESULTS DASHBOARD ═══════ */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="cat-score-pattern pb-4">
            {submittedAt && <PercentileCountdown startedAt={submittedAt} />}
            {/* Candidate Info */}
            <section className="max-w-5xl mx-auto px-4 pt-8">
              <div className="bg-card border border-border rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-foreground font-bold text-lg">{result.candidateName}</p>
                    <p className="text-xs text-muted-foreground">{result.subject} • {result.testDate} • {result.testTime}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleShare}><Share2 className="w-4 h-4 mr-1" /> Share</Button>
                  <Button variant="outline" size="sm" onClick={() => { setResult(null); setHtmlInput(""); setSubmittedAt(null); }}>Calculate Again</Button>
                </div>
              </div>
            </section>

            {/* Headline score cards */}
            <SectionInView className="max-w-5xl mx-auto px-4 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Total Score", value: result.overall.totalScore, sub: `out of ${result.overall.maxScore}`, icon: Target, strong: true },
                  { label: "Accuracy", value: `${result.overall.accuracy.toFixed(1)}%`, sub: `${result.overall.correct}/${result.overall.attempted} correct`, icon: CheckCircle2 },
                  { label: "Attempted", value: result.overall.attempted, sub: `of ${result.overall.totalQuestions} questions`, icon: BookOpen },
                  { label: "Percentile", value: "24 hrs", sub: "arriving on your email", icon: TrendingUp },
                ].map((card, i) => (
                  <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.07 }}
                    className={`relative overflow-hidden rounded-xl border p-4 shadow-sm ${card.strong ? "border-primary/30 bg-primary text-primary-foreground" : "border-border bg-card"}`}>
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium uppercase tracking-wider ${card.strong ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{card.label}</p>
                      <card.icon className={`h-4 w-4 ${card.strong ? "text-primary-foreground/80" : "text-primary"}`} />
                    </div>
                    <p className={`mt-2 text-2xl md:text-4xl font-bold tabular-nums ${card.strong ? "" : "text-foreground"}`}>{card.value}</p>
                    <p className={`mt-1 text-sm ${card.strong ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{card.sub}</p>
                  </motion.div>
                ))}
              </div>
            </SectionInView>

            {/* Complete Score Summary (moved up) */}
            <SectionInView className="max-w-5xl mx-auto px-4 mb-6 md:mb-10">
              <ResultHead index="01" title="Complete Score Summary" sub="Every section at a glance, scored on the official CAT marking scheme" />
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        {["Section", "Total", "Attempted", "Correct", "Incorrect", "Score", "Accuracy"].map((h, i) => (
                          <th key={h} className={`${i === 0 ? "text-left px-4" : "text-center px-3"} py-2.5 text-sm font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.sections.map((s) => (
                        <tr key={s.section} className="border-b border-border/60">
                          <td className="px-4 py-3 font-semibold text-foreground">{s.section}</td>
                          <td className="text-center px-3 py-3 text-muted-foreground tabular-nums">{s.total}</td>
                          <td className="text-center px-3 py-3 text-foreground tabular-nums">{s.attempted}</td>
                          <td className="text-center px-3 py-3 text-foreground tabular-nums">{s.correct}</td>
                          <td className="text-center px-3 py-3 text-muted-foreground tabular-nums">{s.incorrect}</td>
                          <td className="text-center px-3 py-3 text-primary font-bold tabular-nums">{s.score}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2 min-w-24">
                              <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary/70 rounded-full" style={{ width: `${Math.min(100, s.accuracy)}%` }} /></div>
                              <span className="text-foreground tabular-nums">{s.accuracy.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-primary/5">
                        <td className="px-4 py-3 font-bold text-foreground">Total</td>
                        <td className="text-center px-3 py-3 text-foreground font-semibold tabular-nums">{result.overall.totalQuestions}</td>
                        <td className="text-center px-3 py-3 text-foreground font-semibold tabular-nums">{result.overall.attempted}</td>
                        <td className="text-center px-3 py-3 text-foreground font-semibold tabular-nums">{result.overall.correct}</td>
                        <td className="text-center px-3 py-3 text-muted-foreground font-semibold tabular-nums">{result.overall.incorrect}</td>
                        <td className="text-center px-3 py-3 text-primary font-bold text-xl tabular-nums">{result.overall.totalScore}</td>
                        <td className="text-center px-3 py-3 text-foreground font-semibold tabular-nums">{result.overall.accuracy.toFixed(1)}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </SectionInView>

            {/* Score scale vs 2026 aspirants */}
            <SectionInView className="max-w-5xl mx-auto px-4 mb-6 md:mb-10">
              <ResultHead index="02" title="Where You Stand" sub="Your score against the average of CAT 2026 aspirants on this calculator" />
              <ScoreScale you={result.overall.totalScore} max={result.overall.maxScore} avg={liveStats?.year.avg ?? 0} count={liveStats?.year.count ?? 0} top={liveStats?.year.highest ?? 0} />
            </SectionInView>

            {/* Section-wise Breakdown */}
            <SectionInView className="max-w-5xl mx-auto px-4 mb-6 md:mb-10">
              <ResultHead index="03" title="Section-wise Breakdown" sub="Attempts, accuracy and marks for VARC, DILR and QA" />
              <div className="grid md:grid-cols-3 gap-3">
                {result.sections.map((section, i) => {
                  const maxSec = section.total * 3;
                  return (
                    <motion.div key={section.section} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }}
                      className="rounded-xl border border-border bg-card p-4 shadow-sm">
                      <div className="flex items-baseline justify-between">
                        <h3 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">{section.section}</h3>
                        <p className="text-foreground"><span className="text-2xl font-bold tabular-nums text-primary">{section.score}</span><span className="text-sm text-muted-foreground"> / {maxSec}</span></p>
                      </div>
                      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
                        <div className="bg-primary" style={{ width: `${(section.correct / section.total) * 100}%` }} />
                        <div className="bg-primary/30" style={{ width: `${(section.incorrect / section.total) * 100}%` }} />
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        {[["Correct", section.correct], ["Wrong", section.incorrect], ["Skipped", section.unattempted]].map(([l, v]) => (
                          <div key={l as string} className="rounded-lg bg-muted/50 py-2">
                            <p className="text-base font-bold tabular-nums text-foreground">{v}</p>
                            <p className="text-sm text-muted-foreground">{l}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm">
                        <span className="text-muted-foreground">Accuracy · {section.attempted}/{section.total} attempted</span>
                        <span className="font-semibold text-foreground tabular-nums">{section.accuracy.toFixed(1)}%</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </SectionInView>

            {/* AI Insights Section */}
            <SectionInView className="max-w-5xl mx-auto px-4 mb-6 md:mb-10">
              <ResultHead index="04" title="AI-Powered Performance Insights" sub="Personalised analysis based on your response data" />
              <div className="grid md:grid-cols-2 gap-3">
                {(() => {
                  const bestSection = [...result.sections].sort((a, b) => b.accuracy - a.accuracy)[0];
                  const worstSection = [...result.sections].sort((a, b) => a.accuracy - b.accuracy)[0];
                  const totalNeg = result.questions.filter(q => q.questionType === "MCQ" && !q.isCorrect && (q.status === "Answered" || q.status === "Answered & Marked for Review")).length;
                  const attemptRate = ((result.overall.attempted / result.overall.totalQuestions) * 100).toFixed(0);
                  const insights = [
                    { icon: Trophy, title: "Strongest Section", text: `${bestSection.section} with ${bestSection.accuracy.toFixed(1)}% accuracy. Protect this edge in your mocks.` },
                    { icon: TrendingDown, title: "Needs Improvement", text: `${worstSection.section} at ${worstSection.accuracy.toFixed(1)}% accuracy. Focused practice here gives the biggest score gain.` },
                    { icon: Shield, title: "Negative Marks Impact", text: `You lost ${totalNeg} marks to negative marking. Cutting MCQ guesswork could add ${Math.round(totalNeg * 0.7)}+ marks.` },
                    { icon: Brain, title: "Attempt Strategy", text: `${attemptRate}% attempt rate. ${Number(attemptRate) > 80 ? "Excellent coverage. Focus on accuracy now." : Number(attemptRate) > 60 ? "Good coverage. Push to 75%+ in weaker sections." : "Low coverage. Work on time management to attempt more."}` },
                  ];
                  return insights.map((insight) => (
                    <div key={insight.title} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"><insight.icon className="h-4 w-4 text-primary" /></span>
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{insight.title}</p>
                        <p className="mt-1 text-sm text-foreground leading-relaxed">{insight.text}</p>
                      </div>
                    </div>
                  ));
                })()}
              </div>
              <div className="mt-4 text-center">
                <Link to="/tools/profile-analyzer">
                  <Button variant="outline" size="sm" className="text-primary border-primary/20 hover:bg-primary/5">
                    <BrainCircuit className="w-4 h-4 mr-1" /> Get Full AI Profile Analysis <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </SectionInView>

            {/* Peer Comparison */}
            <SectionInView className="max-w-5xl mx-auto px-4 mb-6 md:mb-10">
              <ResultHead index="05" title="Peer Comparison" sub="Section scores against fellow aspirants and toppers" />
              <div className="grid md:grid-cols-2 gap-3">
                <SectionAvgComparison result={result} averages={liveStats?.year.count ? liveStats.year.sections : undefined} />
                <TopperComparisonBar result={result} />
              </div>
            </SectionInView>

            {/* Visual Analysis */}
            <SectionInView className="max-w-5xl mx-auto px-4 mb-6 md:mb-10">
              <ResultHead index="06" title="Visual Analysis" sub="Your attempt pattern, accuracy and marks visualised" />
              <div className="grid md:grid-cols-2 gap-3">
                <SectionRadarChart result={result} />
                <AttemptBreakdownPie result={result} />
                <SectionScoreBar result={result} />
                <AccuracyBySection result={result} />
                <QuestionTypeAnalysis result={result} />
                <NegativeMarksCard result={result} />
              </div>
            </SectionInView>

            {/* Deep Performance Insights */}
            <SectionInView className="max-w-5xl mx-auto px-4 mb-6 md:mb-10">
              <ResultHead index="07" title="Deep Performance Insights" sub="Strengths, mistakes and difficulty-level performance" />
              <div className="grid md:grid-cols-2 gap-3">
                <StrengthWeaknessChart result={result} />
                <MistakeAnalysisChart result={result} />
                <DifficultyPerformanceChart result={result} />
                <SectionDifficultyHeatmap />
              </div>
            </SectionInView>
            {/* Question-wise Detail */}
            <SectionInView className="max-w-5xl mx-auto px-4 mb-6 md:mb-10">
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                <button onClick={() => setShowQuestions(!showQuestions)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <span className="text-foreground font-bold">Question-wise Details</span>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{result.questions.length} questions</span>
                  </div>
                  {showQuestions ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                </button>
                <AnimatePresence>
                  {showQuestions && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-card z-10">
                            <tr className="border-b border-border">
                              {["Q#", "Section", "Type", "Status", "Your Ans", "Correct", "Result"].map(h => (
                                <th key={h} className={`${h === "Q#" ? "text-left px-4" : "text-center px-3"} py-2.5 text-muted-foreground font-medium`}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {result.questions.map((q, i) => (
                              <tr key={i} className={`border-b border-border/30 ${q.isCorrect ? "bg-primary/5" : q.status === "Answered" ? "bg-muted/40" : ""}`}>
                                <td className="px-4 py-2 text-foreground font-medium">Q.{q.questionNumber}</td>
                                <td className="px-3 py-2 text-center"><span className={`${SECTION_COLORS[q.section]?.text || "text-foreground"} font-medium`}>{q.section}</span></td>
                                <td className="text-center px-3 py-2 text-muted-foreground">{q.questionType}</td>
                                <td className="text-center px-3 py-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${q.status === "Answered" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{q.status}</span>
                                </td>
                                <td className="text-center px-3 py-2 text-foreground font-medium">{q.chosenOption || "—"}</td>
                                <td className="text-center px-3 py-2 text-muted-foreground">{q.correctOption || "—"}</td>
                                <td className="text-center px-3 py-2">
                                  {q.status !== "Answered" ? <MinusCircle className="w-4 h-4 text-muted-foreground mx-auto" /> :
                                    q.isCorrect ? <CheckCircle2 className="w-4 h-4 text-primary mx-auto" /> :
                                      <XCircle className="w-4 h-4 text-destructive mx-auto" />}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </SectionInView>

            {/* CTA Section */}
            <SectionInView className="max-w-5xl mx-auto px-4 mb-6 md:mb-10">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-primary/5 border border-primary/15 rounded-2xl p-6 shadow-xs hover:shadow-md transition-shadow">
                  <Award className="w-8 h-8 text-primary mb-3" />
                  <h3 className="text-foreground font-bold text-lg mb-2">Want to Improve Your Score?</h3>
                  <p className="text-muted-foreground text-sm mb-4">Get AI-powered profile analysis with college predictions and strategy</p>
                  <Link to="/tools/profile-analyzer"><Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Analyse My Profile <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
                </div>
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xs hover:shadow-md transition-shadow">
                  <TrendingUp className="w-8 h-8 text-primary mb-3" />
                  <h3 className="text-foreground font-bold text-lg mb-2">Find Best Coaching</h3>
                  <p className="text-muted-foreground text-sm mb-4">Compare top CAT coaching centres with verified reviews and results</p>
                  <Link to="/category/cat"><Button variant="outline">Browse Coaching <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
                </div>
              </div>
            </SectionInView>
          </motion.div>
        )}
      </AnimatePresence>

      <CatHubSections />

      {/* ═══════ AGGREGATED TREND CHARTS ═══════ */}
      <section className="bg-muted/30 py-8 md:py-14">
        <div className="max-w-5xl mx-auto px-4">
          <SectionInView>
            <div className="text-center mb-6 md:mb-10">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">CAT Percentile Predictor</h2>
              <p className="text-base text-muted-foreground leading-relaxed">Estimate where your raw score places you among CAT test-takers</p>
            </div>
          </SectionInView>

          <SectionInView delay={0.1}>
            <PercentilePredictorPanel />
          </SectionInView>
        </div>
      </section>

      {/* ═══════ WHAT IS CAT — CONTENT SECTION ═══════ */}
      <SectionInView className="max-w-5xl mx-auto px-4 py-8 md:py-14">
        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-4">What is CAT Exam?</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              The Common Admission Test (CAT) is India's premier MBA entrance exam conducted by the Indian Institutes of Management (IIMs). CAT is usually held in late November, testing candidates on Verbal Ability & Reading Comprehension (VARC), Data Interpretation & Logical Reasoning (DILR), and Quantitative Ability (QA).
            </p>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              Over 2.5 lakh students appear for CAT every year, competing for approximately 5,000 seats across 20 IIMs and 1,000+ other B-schools that accept CAT scores. The exam follows a computer-based test format with a duration of 120 minutes divided equally across three sections.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
              Our CAT Score Calculator helps you check your performance instantly by parsing your official response sheet from the IIM CAT portal (iimcat.ac.in). It provides section-wise analysis, accuracy metrics, percentile estimation, and AI-powered personalized recommendations to guide your MBA admission journey.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-4">How Does This Calculator Work?</h2>
            <div className="space-y-4">
              {[
                { icon: FileText, title: "Parses Official HTML", desc: "Reads the exact response data from your CAT response sheet hosted on TCS iON CDN." },
                { icon: Calculator, title: "Applies Official Marking", desc: "+3 for correct MCQ, -1 for incorrect MCQ, 0 for TITA/unattempted. 100% accurate scoring." },
                { icon: BarChart3, title: "Section-wise Analysis", desc: "Breaks down VARC, DILR, QA separately with accuracy, attempts, and negative marks per section." },
                { icon: TrendingUp, title: "Percentile Prediction", desc: "Estimates your percentile based on historical CAT data and current year score distributions." },
                { icon: Sparkles, title: "AI-Powered Insights", desc: "Identifies your strengths, weaknesses, mistake patterns, and provides personalized improvement tips." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionInView>

      {/* ═══════ CAT MARKING SCHEME ═══════ */}
      <section className="bg-muted/20 py-8 md:py-14">
        <div className="max-w-5xl mx-auto px-4">
          <SectionInView>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">CAT 2026 Marking Scheme</h2>
              <p className="text-base text-muted-foreground leading-relaxed">Understanding how your CAT score is calculated</p>
            </div>
          </SectionInView>

          <SectionInView delay={0.1}>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {[
                { label: "Correct Answer (MCQ)", marks: "+3", color: "bg-card border-border text-primary", icon: CheckCircle2 },
                { label: "Incorrect Answer (MCQ)", marks: "-1", color: "bg-card border-border text-foreground", icon: XCircle },
                { label: "Incorrect / Unanswered (TITA)", marks: "0", color: "bg-card border-border text-muted-foreground", icon: MinusCircle },
              ].map((item) => (
                <motion.div key={item.label} whileHover={{ y: -4 }} className={`${item.color} border rounded-2xl p-6 text-center shadow-xs`}>
                  <item.icon className="w-8 h-8 mx-auto mb-3" />
                  <p className="text-2xl font-bold mb-2">{item.marks}</p>
                  <p className="text-sm font-medium">{item.label}</p>
                </motion.div>
              ))}
            </div>
          </SectionInView>

          <SectionInView delay={0.2}>
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xs">
              <h3 className="font-bold text-foreground mb-4">CAT 2026 Exam Pattern (Expected)</h3>
              <div className="overflow-x-auto">
                <table className="cat-table w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground font-medium">Section</th>
                      <th className="text-center py-2 text-muted-foreground font-medium">MCQs</th>
                      <th className="text-center py-2 text-muted-foreground font-medium">TITA</th>
                      <th className="text-center py-2 text-muted-foreground font-medium">Total Qs</th>
                      <th className="text-center py-2 text-muted-foreground font-medium">Max Marks</th>
                      <th className="text-center py-2 text-muted-foreground font-medium">Time (min)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { section: "VARC", mcq: 16, tita: 8, total: 24, marks: 72, time: 40, color: "text-primary" },
                      { section: "DILR", mcq: 14, tita: 8, total: 22, marks: 66, time: 40, color: "text-foreground" },
                      { section: "QA", mcq: 14, tita: 8, total: 22, marks: 66, time: 40, color: "text-foreground" },
                    ].map((row) => (
                      <tr key={row.section} className="border-b border-border/50">
                        <td className={`py-2.5 font-semibold ${row.color}`}>{row.section}</td>
                        <td className="text-center py-2.5 text-foreground">{row.mcq}</td>
                        <td className="text-center py-2.5 text-foreground">{row.tita}</td>
                        <td className="text-center py-2.5 text-foreground font-semibold">{row.total}</td>
                        <td className="text-center py-2.5 text-foreground font-bold">{row.marks}</td>
                        <td className="text-center py-2.5 text-foreground">{row.time}</td>
                      </tr>
                    ))}
                    <tr className="bg-primary/5 font-bold">
                      <td className="py-2.5 text-foreground">Total</td>
                      <td className="text-center py-2.5 text-foreground">44</td>
                      <td className="text-center py-2.5 text-foreground">24</td>
                      <td className="text-center py-2.5 text-foreground">68</td>
                      <td className="text-center py-2.5 text-primary text-base">204</td>
                      <td className="text-center py-2.5 text-foreground">120</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </SectionInView>
        </div>
      </section>

      {/* ═══════ HOW TO CALCULATE + SECTIONAL + TARGETS ═══════ */}
      <section id="how-to-calculate-cat-score" className="max-w-5xl mx-auto px-4 py-8 md:py-14 space-y-10">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-3">How to Calculate Your CAT Score</h2>
          <p className="text-base text-muted-foreground leading-relaxed mb-4">Your CAT raw score follows one simple formula, applied separately to VARC, DILR and QA and then added up:</p>
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-4">
            <p className="font-bold text-foreground">CAT score = (Correct answers × 3) − (Wrong MCQs × 1)</p>
            <p className="text-sm text-muted-foreground mt-1">Wrong TITA answers and unattempted questions score 0.</p>
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Worked example</h3>
          <div className="overflow-x-auto bg-card border border-border rounded-2xl">
            <table className="cat-table w-full">
              <thead><tr className="border-b border-border bg-primary/5">
                <th className="text-left py-2.5 px-3 md:py-3 md:px-4">Section</th><th className="text-center py-2.5 px-2">Correct</th><th className="text-center py-2.5 px-2">Wrong MCQ</th><th className="text-center py-2.5 px-2">Wrong TITA</th><th className="text-center py-2.5 px-3 md:py-3 md:px-4">Score</th>
              </tr></thead>
              <tbody>
                {[["VARC",12,4,1,32],["DILR",7,3,1,18],["QA",9,4,2,23]].map(([s,c,w,t,sc]) => (
                  <tr key={s as string} className="border-b border-border last:border-0">
                    <td className="py-2.5 px-4 font-semibold">{s}</td><td className="text-center">{c}</td><td className="text-center">{w}</td><td className="text-center">{t}</td><td className="text-center font-bold">{sc}</td>
                  </tr>
                ))}
                <tr className="bg-primary/5 font-bold"><td className="py-2.5 px-4">Total</td><td className="text-center">28</td><td className="text-center">11</td><td className="text-center">4</td><td className="text-center text-primary">73</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground mt-3">A total of 73 would sit around the 95th percentile on the approximate bands below. Paste your response sheet above to get your exact figure in seconds.</p>
        </div>

        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-3">Sectional CAT Score vs Percentile</h2>
          <p className="text-base text-muted-foreground leading-relaxed mb-4">Most IIMs apply sectional cut-offs, so check each section separately. Approximate raw scores needed for each percentile in recent years:</p>
          <div className="overflow-x-auto bg-card border border-border rounded-2xl">
            <table className="cat-table w-full">
              <thead><tr className="border-b border-border bg-primary/5">
                <th className="text-left py-2.5 px-3 md:py-3 md:px-4">Percentile</th><th className="text-center py-2.5 px-2">VARC (/72)</th><th className="text-center py-2.5 px-2">DILR (/66)</th><th className="text-center py-2.5 px-2">QA (/66)</th>
              </tr></thead>
              <tbody>
                {CAT_SECTIONAL_VS_PERCENTILE.map((r) => (
                  <tr key={r.percentile} className="border-b border-border last:border-0">
                    <td className="py-2.5 px-4 font-semibold">{r.percentile}</td><td className="text-center">{r.varc}</td><td className="text-center">{r.dilr}</td><td className="text-center">{r.qa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground mt-3">DILR usually needs the lowest raw score for a given percentile because it tends to be the toughest section. Bands shift every year.</p>
        </div>

        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-3">Which Percentile Do You Need? Indicative B-School Targets</h2>
          <p className="text-base text-muted-foreground leading-relaxed mb-4">Overall percentiles that have typically been competitive for an interview shortlist (General category). These are not official cut-offs; academics, work experience and diversity also count.</p>
          <div className="overflow-x-auto bg-card border border-border rounded-2xl">
            <table className="cat-table w-full">
              <thead><tr className="border-b border-border bg-primary/5"><th className="text-left py-2.5 px-3 md:py-3 md:px-4">B-schools</th><th className="text-left py-2.5 px-3 md:py-3 md:px-4">Indicative percentile</th></tr></thead>
              <tbody>
                {CAT_INDICATIVE_TARGETS.map((r) => (
                  <tr key={r.group} className="border-b border-border last:border-0"><td className="py-2.5 px-4">{r.group}</td><td className="py-2.5 px-4 font-semibold">{r.target}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Always check each institute's official admission policy. Explore <Link to="/mba-application" className="text-primary underline">open MBA applications</Link> to see current deadlines.
          </p>
        </div>

        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-3">What Decides Your Final CAT Percentile?</h2>
          <ul className="list-disc pl-5 space-y-2 text-base text-muted-foreground leading-relaxed">
            <li><span className="font-semibold text-foreground">Slot normalisation:</span> CAT runs in multiple slots, so raw scores are converted into scaled scores before percentiles are computed.</li>
            <li><span className="font-semibold text-foreground">Paper difficulty:</span> a tougher paper lowers the score needed for the same percentile.</li>
            <li><span className="font-semibold text-foreground">Accuracy:</span> each wrong MCQ costs one mark, so accuracy often matters more than the number of attempts.</li>
            <li><span className="font-semibold text-foreground">Sectional balance:</span> a weak section can block shortlists even with a strong overall percentile.</li>
          </ul>
        </div>

        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-3">CAT Score vs Percentile: Why the Two Differ</h2>
          <p className="text-base text-muted-foreground leading-relaxed mb-3">Your CAT score is an absolute number: the marks you earned out of 204. Your percentile is relative: it tells you what share of test-takers scored below you. Two candidates with the same raw score in different slots can end up with slightly different percentiles because the IIMs first convert raw scores into scaled scores to even out slot difficulty.</p>
          <p className="text-base text-muted-foreground leading-relaxed">That is why this calculator gives an exact raw score but only an estimated percentile. Use the estimate to plan, and wait for the official scorecard before final decisions.</p>
        </div>

        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-3">How to Use This CAT Score Calculator</h2>
          <ol className="list-decimal pl-5 space-y-2 text-base text-muted-foreground leading-relaxed">
            <li>Log in to the official CAT portal once the response sheet is released.</li>
            <li>Open the candidate response page for your slot.</li>
            <li>View the page source, select all and copy it.</li>
            <li>Paste it into the calculator at the top of this page and submit.</li>
            <li>Review your section-wise score, accuracy and estimated percentile, then compare it with the tables above.</li>
          </ol>
          <p className="text-sm text-muted-foreground mt-3">Wait for the official answer key before treating your score as final. If the IIMs change a key after objections, recalculate.</p>
        </div>

        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-3">What to Do After Calculating Your CAT Score</h2>
          <ul className="list-disc pl-5 space-y-2 text-base text-muted-foreground leading-relaxed">
            <li><span className="font-semibold text-foreground">Shortlist realistically:</span> match your estimated percentile and sectional scores with the target table above.</li>
            <li><span className="font-semibold text-foreground">Check your profile fit:</span> IIM shortlists also weigh 10th, 12th and graduation marks, work experience and diversity. Try the <Link to="/tools/profile-analyzer" className="text-primary underline">Profile Analyzer</Link>.</li>
            <li><span className="font-semibold text-foreground">Track deadlines:</span> many non-IIM colleges accept CAT scores with their own forms. See <Link to="/mba-application" className="text-primary underline">open MBA applications</Link>.</li>
            <li><span className="font-semibold text-foreground">Start interview prep early:</span> written ability tests, group discussions and personal interviews usually begin between February and April.</li>
            <li><span className="font-semibold text-foreground">Keep a backup:</span> if your score is below target, exams such as XAT, SNAP, NMAT and CMAT run on different schedules.</li>
          </ul>
        </div>

        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-3">Tips to Raise Your CAT Score Next Attempt</h2>
          <ul className="list-disc pl-5 space-y-2 text-base text-muted-foreground leading-relaxed">
            <li><span className="font-semibold text-foreground">Protect accuracy:</span> skip MCQs where you can't eliminate at least two options, since every wrong answer costs a mark.</li>
            <li><span className="font-semibold text-foreground">Attempt every TITA you can:</span> wrong TITA answers carry no penalty.</li>
            <li><span className="font-semibold text-foreground">Choose sets wisely in DILR:</span> spend the first few minutes scanning all sets and pick the two or three most solvable.</li>
            <li><span className="font-semibold text-foreground">Read daily for VARC:</span> regular reading of editorials and long-form essays builds RC speed.</li>
            <li><span className="font-semibold text-foreground">Analyse every mock:</span> run each mock response sheet through this calculator and track accuracy by section over time.</li>
          </ul>
        </div>
      </section>

      {/* ═══════ CAT SCORE VS PERCENTILE ═══════ */}
      <section id="cat-score-vs-percentile" className="py-14">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-3">CAT Score vs Percentile</h2>
          <p className="text-base text-muted-foreground leading-relaxed mb-6">
            Once the calculator gives your score, use this table to see roughly which percentile it corresponds to. The bands are approximate, compiled from publicly reported CAT 2024 results (scaled scores out of 204), and shift every year with slot difficulty and normalisation.
          </p>
          <div className="overflow-x-auto bg-card border border-border rounded-2xl">
            <table className="cat-table w-full">
              <thead>
                <tr className="border-b border-border bg-primary/5">
                  <th className="text-left py-2.5 px-3 md:py-3 md:px-4 text-foreground">CAT percentile</th>
                  <th className="text-left py-2.5 px-3 md:py-3 md:px-4 text-foreground">Approx. scaled score (out of 204)</th>
                </tr>
              </thead>
              <tbody>
                {CAT_SCORE_VS_PERCENTILE.map((r) => (
                  <tr key={r.percentile} className="border-b border-border last:border-0">
                    <td className="py-2.5 px-4 font-semibold text-foreground">{r.percentile}</td>
                    <td className="py-2.5 px-4 text-foreground">{r.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Your raw score from the calculator is exact. Your final percentile is published by the IIMs after normalising scores across slots, and most IIMs also apply sectional cut-offs.
          </p>
        </div>
      </section>

      {/* ═══════ FAQ SECTION ═══════ */}
      <section className="bg-muted/30 py-8 md:py-14">
        <div className="max-w-3xl mx-auto px-4">
          <SectionInView>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">Frequently Asked Questions</h2>
              <p className="text-base text-muted-foreground leading-relaxed">Common questions about the CAT score calculator and CAT score vs percentile</p>
            </div>
          </SectionInView>

          <div className="space-y-4">
            {[...CAT_CALCULATOR_FAQS, ...CAT_SCORE_EXTRA_FAQS, 
              { q: "How accurate is this CAT Score Calculator?", a: "Our calculator uses the exact official CAT marking scheme (+3 for correct MCQ, -1 for incorrect MCQ, 0 for TITA). The score calculation is 100% accurate. Percentile estimates are based on historical data and may vary slightly from actual results." },
              { q: "Is my data safe and private?", a: "Yes, your response sheet data is processed securely. We only store aggregate scores for analysis purposes. Your personal response details are kept confidential." },
              { q: "What is a TITA question?", a: "TITA stands for 'Type In The Answer'. These are non-MCQ questions where you type your answer directly. There is no negative marking for incorrect TITA answers." },
              { q: "How is the percentile estimated?", a: "Percentile estimation is based on historical CAT data from previous years and the current score distribution of all students who have used our calculator. Actual percentiles will be released by IIMs." },
              { q: "Can I calculate scores for multiple slots?", a: "Yes! You can calculate scores for any slot by pasting the respective response sheet HTML. Each slot's difficulty may vary, which is factored into the percentile estimation." },
              { q: "What if my response sheet URL is not working?", a: "The CAT response sheet CDN blocks direct fetching. You need to open it in your browser, view the page source (Ctrl+U), copy all the HTML code, and paste it in our calculator." },
              { q: "What is the difference between MCQ and TITA in CAT?", a: "MCQs (Multiple Choice Questions) have 4 options with +3 for correct and -1 for wrong answers. TITA (Type In The Answer) questions require typing numeric/text answers with +3 for correct and 0 for wrong — no negative marking." },
              { q: "Can I use this calculator for XAT, SNAP, or other MBA exams?", a: "Currently, this tool is specifically designed for CAT response sheets. We plan to add support for XAT, SNAP, NMAT, and other MBA entrance exams soon." },
            ].map((faq, i) => (
              <SectionInView key={i} delay={i * 0.03}>
                <details className="bg-card border border-border rounded-xl shadow-xs group">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-xl">
                    <span className="text-foreground font-semibold text-sm pr-4">{faq.q}</span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-5 pb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              </SectionInView>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ SEO KEYWORDS SECTIONS ═══════ */}
      <section className="py-14">
        <div className="max-w-5xl mx-auto px-4">
          <SectionInView>
            <div className="text-center mb-6 md:mb-10">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">Related Topics & Popular Searches</h2>
              <p className="text-base text-muted-foreground leading-relaxed">Explore more about CAT 2025 score calculation, percentile prediction, and MBA admissions</p>
            </div>
          </SectionInView>

          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            {/* Long Tail Keywords */}
            <SectionInView delay={0.1}>
              <div className="bg-card border border-border rounded-2xl p-6 shadow-xs h-full">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Search className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-foreground font-bold">Detailed Keywords</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {LONG_TAIL_KEYWORDS.map((kw) => (
                    <span key={kw} className="text-xs bg-primary/5 text-primary border border-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors cursor-default">{kw}</span>
                  ))}
                </div>
              </div>
            </SectionInView>

            {/* Short Tail Keywords */}
            <SectionInView delay={0.2}>
              <div className="bg-card border border-border rounded-2xl p-6 shadow-xs h-full">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Tag className="w-4 h-4 text-foreground" />
                  </div>
                  <h3 className="text-foreground font-bold">Popular Topics</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SHORT_TAIL_KEYWORDS.map((kw) => (
                    <span key={kw} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors cursor-default">{kw}</span>
                  ))}
                </div>
              </div>
            </SectionInView>
          </div>

          {/* Student Queries */}
          <SectionInView delay={0.3} className="mt-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <FileQuestion className="w-4 h-4 text-foreground" />
                </div>
                <h3 className="text-foreground font-bold">Students Also Ask</h3>
              </div>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {STUDENT_QUERIES.map((q) => (
                  <div key={q} className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionInView>

          {/* Trending Searches */}
          <SectionInView delay={0.4} className="mt-6">
            <div className="bg-gradient-to-r from-primary/5 to-secondary/10 border border-primary/10 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-foreground font-bold">Trending Now</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  "CAT 2025 result date", "CAT cutoff 2025 IIM A", "CAT score vs percentile 2025",
                  "best CAT coaching online", "CAT DILR score improvement", "CAT VARC strategy 2025",
                  "IIM admission criteria 2025", "MBA colleges accepting CAT score",
                  "CAT retaker strategy", "CAT score calculator with AI",
                ].map((kw) => (
                  <span key={kw} className="text-xs bg-white/80 text-primary border border-primary/15 px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors cursor-default flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> {kw}
                  </span>
                ))}
              </div>
            </div>
          </SectionInView>
        </div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <SectionInView className="max-w-4xl mx-auto px-4 py-8 md:py-14 text-center">
        <div className="bg-gradient-to-br from-primary/10 via-secondary/20 to-primary/5 border border-primary/15 rounded-3xl p-8 md:p-12 shadow-lg">
          <BrainCircuit className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-3">Ready to Calculate Your CAT Score?</h2>
          <p className="text-base text-muted-foreground leading-relaxed mb-6 max-w-lg mx-auto">
            Join {liveStats?.total ? liveStats.total.toLocaleString() : "thousands of"} students who have already analyzed their performance. Get instant section-wise scores, accuracy analysis, and AI-powered insights.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-6 text-base shadow-lg hover:shadow-xl transition-all">
              <Calculator className="w-5 h-5 mr-2" /> Calculate Now — It's Free
            </Button>
            <Link to="/tools/profile-analyzer">
              <Button variant="outline" size="lg" className="px-8 py-6 text-base font-bold">
                AI Profile Analysis <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </SectionInView>
    </div>
  );
};

export default CATScoreCalculatorPage;
