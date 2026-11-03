// Shared XAT scoring rules, percentile model and settings.
// Official XAT marking: +1 correct, −0.25 wrong, and −0.10 for every
// unattempted question beyond the first 8 in Part 1 (VALR, DM, QA&DI).
// GK is scored separately (+1 correct, no negative marking) and is not used for percentile.
import { interpolatePercentile, type ScorePoint } from "@/lib/catScoreEngine";
import type { ParsedQuestion } from "@/lib/catParser";
import type { MarkingScheme } from "@/components/cat/questionAnalysis";

export type XatSectionKey = "VALR" | "DM" | "QADI" | "GK";
export const XAT_PART1: Exclude<XatSectionKey, "GK">[] = ["VALR", "DM", "QADI"];
export const XAT_SECTION_LABELS: Record<XatSectionKey, string> = {
  VALR: "Verbal & Logical Ability",
  DM: "Decision Making",
  QADI: "Quantitative Ability & Data Interpretation",
  GK: "General Knowledge",
};
export const XAT_CORRECT = 1;
export const XAT_WRONG = 0.25;
export const XAT_FREE_SKIPS = 8;
export const XAT_SKIP_PENALTY = 0.1;
export const XAT_SCHEME: MarkingScheme = { correct: XAT_CORRECT, wrongMcq: XAT_WRONG, wrongTita: XAT_WRONG };
export const XAT_GK_SCHEME: MarkingScheme = { correct: 1, wrongMcq: 0, wrongTita: 0 };

const r2 = (n: number) => Math.round(n * 100) / 100;
const int = (n: unknown) => (Number.isFinite(Number(n)) ? Math.max(0, Math.floor(Number(n))) : 0);

/** Penalty for unattempted Part 1 questions after the first eight. */
export function skipPenalty(unattemptedPart1: number): number {
  return r2(Math.max(0, int(unattemptedPart1) - XAT_FREE_SKIPS) * XAT_SKIP_PENALTY);
}

/** Maps response-sheet section labels to XAT section keys. */
export function xatSectionKey(label: string): XatSectionKey | null {
  const l = label.toLowerCase().replace(/\s+/g, " ");
  if (/general knowledge|\bgk\b|general awareness/.test(l)) return "GK";
  if (/decision/.test(l) || /^dm$/.test(l)) return "DM";
  if (/quant|data interpretation|qa ?& ?di|qadi/.test(l)) return "QADI";
  if (/verbal|logical|valr|\bva\b/.test(l)) return "VALR";
  return null;
}

export interface XatSectionResult {
  key: XatSectionKey; label: string; total: number; attempted: number; correct: number; incorrect: number;
  unattempted: number; unknown: number; score: number; maxScore: number; accuracy: number;
}

export interface XatScore {
  sections: XatSectionResult[];
  part1: { total: number; attempted: number; correct: number; incorrect: number; unattempted: number; rawScore: number; penalty: number; score: number; maxScore: number; accuracy: number };
  gk: XatSectionResult | null;
}

/** Scores parsed questions. Questions without an answer key are left out of marks, never counted as wrong. */
export function scoreXatQuestions(questions: ParsedQuestion[]): XatScore {
  const groups = new Map<XatSectionKey, ParsedQuestion[]>();
  for (const q of questions) {
    const k = (xatSectionKey(q.section) ?? q.section) as XatSectionKey;
    groups.set(k, [...(groups.get(k) || []), q]);
  }
  const order: XatSectionKey[] = ["VALR", "DM", "QADI", "GK"];
  const sections: XatSectionResult[] = order.filter((k) => groups.has(k)).map((key) => {
    const qs = groups.get(key)!;
    const answered = qs.filter((q) => q.status.startsWith("Answered"));
    const correct = answered.filter((q) => q.correctOption && q.isCorrect).length;
    const unknown = answered.filter((q) => !q.correctOption).length;
    const incorrect = answered.length - correct - unknown;
    const isGk = key === "GK";
    const score = r2(correct * XAT_CORRECT - (isGk ? 0 : incorrect * XAT_WRONG));
    return {
      key, label: XAT_SECTION_LABELS[key], total: qs.length, attempted: answered.length, correct, incorrect,
      unattempted: qs.length - answered.length, unknown, score, maxScore: qs.length * XAT_CORRECT,
      accuracy: correct + incorrect ? (correct / (correct + incorrect)) * 100 : 0,
    };
  });
  const p1 = sections.filter((s) => s.key !== "GK");
  const sum = (f: (s: XatSectionResult) => number) => p1.reduce((a, s) => a + f(s), 0);
  const unattempted = sum((s) => s.unattempted);
  const rawScore = r2(sum((s) => s.score));
  const penalty = skipPenalty(unattempted);
  const correct = sum((s) => s.correct), incorrect = sum((s) => s.incorrect);
  return {
    sections,
    part1: {
      total: sum((s) => s.total), attempted: sum((s) => s.attempted), correct, incorrect, unattempted,
      rawScore, penalty, score: r2(rawScore - penalty), maxScore: sum((s) => s.maxScore),
      accuracy: correct + incorrect ? (correct / (correct + incorrect)) * 100 : 0,
    },
    gk: sections.find((s) => s.key === "GK") ?? null,
  };
}

/* ───────── Manual entry ───────── */
export interface XatManualInput { correct: number; wrong: number }
export function validateXatSection(key: XatSectionKey, input: XatManualInput, questions: number): string | null {
  const t = int(input.correct) + int(input.wrong);
  return t > questions ? `${XAT_SECTION_LABELS[key]} has only ${questions} questions; you entered ${t}.` : null;
}
export function scoreXatManual(inputs: Record<XatSectionKey, XatManualInput>, pattern: Record<XatSectionKey, number>) {
  const sec = (k: XatSectionKey) => {
    const c = int(inputs[k]?.correct), w = int(inputs[k]?.wrong);
    return { key: k, correct: c, wrong: w, unattempted: Math.max(0, pattern[k] - c - w), score: r2(c - (k === "GK" ? 0 : w * XAT_WRONG)) };
  };
  const p1 = XAT_PART1.map(sec);
  const unattempted = p1.reduce((a, s) => a + s.unattempted, 0);
  const raw = r2(p1.reduce((a, s) => a + s.score, 0));
  const penalty = skipPenalty(unattempted);
  return { sections: p1, gk: sec("GK"), unattempted, raw, penalty, total: r2(raw - penalty), max: XAT_PART1.reduce((a, k) => a + pattern[k], 0) };
}

/* ───────── Settings (admin-edited) ───────── */
export interface XatCalculatorSettings {
  overall: ScorePoint[];
  overallVerified: boolean;
  sectional: Record<Exclude<XatSectionKey, "GK">, ScorePoint[]>;
  pattern: Record<XatSectionKey, number>;
  cutoffs: { institute: string; overall: string; valr: string; dm: string; qadi: string }[];
  examDateNote: string;
  answerKeyStatus: string;
  statusBanner: string;
  lastUpdated: string;
  videoUrl: string;
}

export const DEFAULT_XAT_SETTINGS: XatCalculatorSettings = {
  // Indicative mapping from publicly reported XAT 2025 results. Admin must verify.
  overall: [[0, 0], [10, 40], [15, 60], [20, 80], [22, 85], [25, 90], [29, 95], [33, 98], [37, 99], [45, 99.9], [76, 100]],
  overallVerified: false,
  sectional: { VALR: [], DM: [], QADI: [] },
  // XAT 2026 pattern. Confirm against the XAT 2027 notification.
  pattern: { VALR: 26, DM: 22, QADI: 28, GK: 20 },
  cutoffs: [],
  examDateNote: "XAT 2027 is expected in the first week of January 2027. Confirm the date on xatonline.in.",
  answerKeyStatus: "Expected a few days after the exam on xatonline.in",
  statusBanner: "",
  lastUpdated: "",
  videoUrl: "",
};

export function mergeXatSettings(raw: unknown): XatCalculatorSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<XatCalculatorSettings>;
  return {
    ...DEFAULT_XAT_SETTINGS, ...r,
    sectional: { ...DEFAULT_XAT_SETTINGS.sectional, ...(r.sectional || {}) },
    pattern: { ...DEFAULT_XAT_SETTINGS.pattern, ...(r.pattern || {}) },
    cutoffs: Array.isArray(r.cutoffs) ? r.cutoffs : [],
    overall: Array.isArray(r.overall) && r.overall.length >= 2 ? r.overall : DEFAULT_XAT_SETTINGS.overall,
  };
}

export function xatPercentileBand(points: ScorePoint[], score: number) {
  const p = interpolatePercentile(points, score);
  if (p == null) return null;
  const spread = p >= 99 ? 0.3 : p >= 95 ? 0.8 : p >= 85 ? 1.5 : 3;
  return { estimate: p, low: Math.max(0, r2(p - spread)), high: Math.min(100, r2(p + spread)) };
}

export function xatPercentileMeaning(p: number | null): string {
  if (p == null) return "Percentile estimate will appear once data is available.";
  if (p >= 98) return "This is in the range usually considered for XLRI Jamshedpur BM and HRM shortlists, subject to sectional cut-offs and profile.";
  if (p >= 94) return "This range is competitive for XLRI Delhi, XIM Bhubaneswar and similar XAT-accepting schools.";
  if (p >= 85) return "This range opens several good XAT-accepting B-schools; check sectional cut-offs closely.";
  return "Focus on sectional cut-offs and look at schools accepting other exams alongside XAT.";
}
