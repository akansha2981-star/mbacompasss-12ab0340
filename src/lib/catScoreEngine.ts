// Shared CAT 2026 scoring rules, percentile model and link validation.
// Facts: 68 questions / 204 marks. VARC 24, DILR 22, QA 22.
// +3 correct, -1 wrong MCQ, 0 wrong TITA, 0 unattempted.

export type CatSectionKey = "VARC" | "DILR" | "QA";
export const CAT_SECTIONS: { key: CatSectionKey; questions: number; marks: number }[] = [
  { key: "VARC", questions: 24, marks: 72 },
  { key: "DILR", questions: 22, marks: 66 },
  { key: "QA", questions: 22, marks: 66 },
];
export const CAT_TOTAL_QUESTIONS = 68;
export const CAT_MAX_SCORE = 204;

export interface SectionInput { correct: number; wrongMcq: number; wrongTita: number }
export interface SectionResult extends SectionInput {
  section: CatSectionKey; questions: number; attempted: number; unattempted: number; score: number; accuracy: number;
}

const int = (n: unknown) => (Number.isFinite(Number(n)) ? Math.max(0, Math.floor(Number(n))) : 0);

/** Returns an error message, or null if the inputs fit the section. */
export function validateSection(section: CatSectionKey, input: SectionInput): string | null {
  const q = CAT_SECTIONS.find((s) => s.key === section)!.questions;
  const total = int(input.correct) + int(input.wrongMcq) + int(input.wrongTita);
  if (total > q) return `${section} has only ${q} questions; you entered ${total}.`;
  return null;
}

export function scoreSection(section: CatSectionKey, input: SectionInput): SectionResult {
  const q = CAT_SECTIONS.find((s) => s.key === section)!.questions;
  const correct = int(input.correct), wrongMcq = int(input.wrongMcq), wrongTita = int(input.wrongTita);
  const attempted = correct + wrongMcq + wrongTita;
  return {
    section, questions: q, correct, wrongMcq, wrongTita, attempted,
    unattempted: Math.max(0, q - attempted),
    score: correct * 3 - wrongMcq,
    accuracy: attempted ? (correct / attempted) * 100 : 0,
  };
}

/* ───────── Percentile model (editable in admin) ───────── */
export type ScorePoint = [score: number, percentile: number];
export interface CatCalculatorSettings {
  overall: ScorePoint[];
  overallVerified: boolean;
  sectional: Record<CatSectionKey, ScorePoint[]>;
  sectionalVerified: boolean;
  /** Multiplier on raw score before lookup; 1 = neutral. */
  slotFactors: Record<"1" | "2" | "3", number>;
  cutoffs: { institute: string; overall: string; varc: string; dilr: string; qa: string }[];
  slotDifficulty: { slot: string; note: string }[];
  statusBanner: string;
  answerKeyStatus: Record<"1" | "2" | "3", string>;
  lastUpdated: string;
  videoUrl: string;
}

export const DEFAULT_CAT_SETTINGS: CatCalculatorSettings = {
  // Indicative CAT 2025 mapping supplied by MBA Compass. Verify against official data.
  overall: [[0, 0], [26, 60], [41, 80], [47, 85], [53, 90], [64, 95], [85, 99], [96, 99.5], [110, 99.9], [204, 100]],
  overallVerified: false,
  sectional: { VARC: [], DILR: [], QA: [] },
  sectionalVerified: false,
  slotFactors: { "1": 1, "2": 1, "3": 1 },
  cutoffs: [],
  slotDifficulty: [
    { slot: "Slot 1", note: "To be updated after the exam on 29 November 2026." },
    { slot: "Slot 2", note: "To be updated after the exam on 29 November 2026." },
    { slot: "Slot 3", note: "To be updated after the exam on 29 November 2026." },
  ],
  statusBanner: "",
  answerKeyStatus: { "1": "Expected around 4 December 2026", "2": "Expected around 4 December 2026", "3": "Expected around 4 December 2026" },
  lastUpdated: "",
  videoUrl: "",
};

export function mergeSettings(raw: unknown): CatCalculatorSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<CatCalculatorSettings>;
  return {
    ...DEFAULT_CAT_SETTINGS, ...r,
    sectional: { ...DEFAULT_CAT_SETTINGS.sectional, ...(r.sectional || {}) },
    slotFactors: { ...DEFAULT_CAT_SETTINGS.slotFactors, ...(r.slotFactors || {}) },
    answerKeyStatus: { ...DEFAULT_CAT_SETTINGS.answerKeyStatus, ...(r.answerKeyStatus || {}) },
    overall: Array.isArray(r.overall) && r.overall.length >= 2 ? r.overall : DEFAULT_CAT_SETTINGS.overall,
  };
}

/** Linear interpolation over sorted score→percentile points. Null when no model. */
export function interpolatePercentile(points: ScorePoint[], score: number): number | null {
  const pts = [...points].filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])).sort((a, b) => a[0] - b[0]);
  if (pts.length < 2) return null;
  if (score <= pts[0][0]) return Math.max(0, pts[0][1]);
  if (score >= pts[pts.length - 1][0]) return Math.min(100, pts[pts.length - 1][1]);
  for (let i = 1; i < pts.length; i++) {
    const [s1, p1] = pts[i - 1], [s2, p2] = pts[i];
    if (score <= s2) return Math.round((p1 + ((score - s1) / (s2 - s1)) * (p2 - p1)) * 100) / 100;
  }
  return null;
}

/** Percentile band (±) around the estimate; wider in the lower range. */
export function percentileBand(points: ScorePoint[], score: number, slot?: "1" | "2" | "3", factors?: CatCalculatorSettings["slotFactors"]) {
  const adj = slot && factors ? score * (factors[slot] || 1) : score;
  const p = interpolatePercentile(points, adj);
  if (p == null) return null;
  const spread = p >= 99 ? 0.3 : p >= 95 ? 0.8 : p >= 85 ? 1.5 : 3;
  return { estimate: p, low: Math.max(0, Math.round((p - spread) * 10) / 10), high: Math.min(100, Math.round((p + spread) * 10) / 10) };
}

export function percentileMeaning(p: number | null): string {
  if (p == null) return "Percentile estimate will appear once data is available.";
  if (p >= 99) return "This is in the range usually needed for calls from IIM Ahmedabad, Bangalore and Calcutta, subject to sectional cut-offs and profile.";
  if (p >= 95) return "This range typically brings calls from several established IIMs, FMS and top non-IIM schools.";
  if (p >= 90) return "This range is competitive for newer IIMs and many strong non-IIM B-schools.";
  if (p >= 80) return "This range opens good private B-schools; check sectional cut-offs closely.";
  return "Focus on sectional cut-offs and look at schools accepting other exams alongside CAT.";
}

/* ───────── Response-sheet link host check (SSRF guard) ───────── */
const ALLOWED_HOSTS = ["digialm.com", "iimcat.ac.in"];
export function isAllowedResponseSheetUrl(value: string): boolean {
  let u: URL;
  try { u = new URL(value.trim()); } catch { return false; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  if (u.username || u.password || (u.port && u.port !== "443" && u.port !== "80")) return false;
  const h = u.hostname.toLowerCase();
  return ALLOWED_HOSTS.some((d) => h === d || h.endsWith("." + d));
}
