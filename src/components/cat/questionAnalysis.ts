import type { ParsedQuestion } from "@/lib/catParser";

export type QuestionOutcome = "correct" | "wrong" | "skipped" | "unknown";
export function questionOutcome(q: ParsedQuestion): QuestionOutcome {
  const answered = q.status.startsWith("Answered");
  if (!answered) return "skipped";
  if (!q.correctOption) return "unknown";
  return q.isCorrect ? "correct" : "wrong";
}

export function analyseQuestions(questions: ParsedQuestion[]) {
  const correct = questions.filter(q => questionOutcome(q) === "correct").length;
  const wrong = questions.filter(q => questionOutcome(q) === "wrong").length;
  const skipped = questions.filter(q => questionOutcome(q) === "skipped").length;
  const unknown = questions.filter(q => questionOutcome(q) === "unknown").length;
  const attempted = questions.length - skipped;
  const negativeMarks = questions.filter(q => questionOutcome(q) === "wrong" && q.questionType === "MCQ").length;
  const mcq = questions.filter(q => q.questionType === "MCQ").length;
  return { correct, wrong, skipped, unknown, attempted, negativeMarks, mcq,
    tita: questions.length - mcq, earnedMarks: correct * 3,
    accuracy: correct + wrong ? correct / (correct + wrong) * 100 : 0,
    attemptRate: questions.length ? attempted / questions.length * 100 : 0 };
}