import { describe, expect, it } from "vitest";
import { analyseQuestions, questionOutcome } from "./questionAnalysis";
import type { ParsedQuestion } from "@/lib/catParser";
const q = (patch: Partial<ParsedQuestion> = {}): ParsedQuestion => ({ section: "VARC", questionNumber: 1, questionType: "MCQ", status: "Answered", chosenOption: "1", correctOption: "1", isCorrect: true, ...patch });
describe("question analysis", () => {
  it("identifies correct marked answers", () => expect(questionOutcome(q())).toBe("correct"));
  it("identifies incorrect marked answers", () => expect(questionOutcome(q({ isCorrect: false, chosenOption: "2" }))).toBe("wrong"));
  it("identifies unattempted answers even if marked for review", () => expect(questionOutcome(q({ status: "Marked for Review" }))).toBe("skipped"));
  it("does not label a missing answer key as an incorrect answer", () => expect(questionOutcome(q({ correctOption: null }))).toBe("unknown"));
  it("counts penalties only for incorrect MCQs, not TITA or skipped questions", () => {
    const stats = analyseQuestions([q(), q({ isCorrect: false }), q({ isCorrect: false, questionType: "SA" }), q({ status: "Not Answered" })]);
    expect(stats).toMatchObject({ correct: 1, wrong: 2, skipped: 1, attempted: 3, negativeMarks: 1, earnedMarks: 3, attemptRate: 75, mcq: 3, tita: 1 });
  });
  it("keeps empty section statistics finite", () => expect(analyseQuestions([])).toMatchObject({ accuracy: 0, attemptRate: 0 }));
});