import type { ParsedQuestion } from "@/lib/catParser";

export type QuestionOutcome = "correct" | "wrong" | "skipped" | "unknown";
export function questionOutcome(q: ParsedQuestion): QuestionOutcome {
  const answered = q.status.startsWith("Answered");
  if (!answered) return "skipped";
  if (!q.correctOption) return "unknown";
  return q.isCorrect ? "correct" : "wrong";
}

/** Marks per outcome. CAT: +3 / −1 MCQ / 0 TITA. XAT: +1 / −0.25. */
export interface MarkingScheme { correct: number; wrongMcq: number; wrongTita: number }
export const CAT_SCHEME: MarkingScheme = { correct: 3, wrongMcq: 1, wrongTita: 0 };

const r2 = (n: number) => Math.round(n * 100) / 100;

export function analyseQuestions(questions: ParsedQuestion[], scheme: MarkingScheme = CAT_SCHEME) {
  const correct = questions.filter(q => questionOutcome(q) === "correct").length;
  const wrong = questions.filter(q => questionOutcome(q) === "wrong").length;
  const skipped = questions.filter(q => questionOutcome(q) === "skipped").length;
  const unknown = questions.filter(q => questionOutcome(q) === "unknown").length;
  const attempted = questions.length - skipped;
  const wrongMcqCount = questions.filter(q => questionOutcome(q) === "wrong" && q.questionType === "MCQ").length;
  const wrongTitaCount = wrong - wrongMcqCount;
  const mcq = questions.filter(q => q.questionType === "MCQ").length;
  return { correct, wrong, skipped, unknown, attempted, mcq, wrongMcqCount,
    negativeMarks: r2(wrongMcqCount * scheme.wrongMcq + wrongTitaCount * scheme.wrongTita),
    tita: questions.length - mcq, earnedMarks: r2(correct * scheme.correct),
    accuracy: correct + wrong ? correct / (correct + wrong) * 100 : 0,
    attemptRate: questions.length ? attempted / questions.length * 100 : 0 };
}
