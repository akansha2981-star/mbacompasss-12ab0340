import { describe, it, expect } from "vitest";
import { skipPenalty, scoreXatManual, scoreXatQuestions, xatSectionKey, DEFAULT_XAT_SETTINGS } from "./xatScoreEngine";
import type { ParsedQuestion } from "./catParser";

const q = (section: string, status: string, isCorrect: boolean, key: string | null = "1"): ParsedQuestion => ({
  section, questionNumber: 1, questionType: "MCQ", status, chosenOption: status.startsWith("Answered") ? (isCorrect ? "1" : "2") : null,
  correctOption: key, isCorrect,
});
const pattern = DEFAULT_XAT_SETTINGS.pattern;

describe("XAT marking", () => {
  it("first 8 unattempted questions are free", () => expect(skipPenalty(8)).toBe(0));
  it("each unattempted question after 8 costs 0.10", () => expect(skipPenalty(12)).toBe(0.4));

  it("correct +1 and wrong −0.25", () => {
    const r = scoreXatManual({ VALR: { correct: 20, wrong: 4 }, DM: { correct: 0, wrong: 0 }, QADI: { correct: 0, wrong: 0 }, GK: { correct: 0, wrong: 0 } }, pattern);
    expect(r.sections[0].score).toBe(19);
  });

  it("applies the skip penalty to the Part 1 total", () => {
    const r = scoreXatManual({ VALR: { correct: 20, wrong: 6 }, DM: { correct: 18, wrong: 4 }, QADI: { correct: 15, wrong: 3 }, GK: { correct: 0, wrong: 0 } }, pattern);
    // 10 unattempted in QA&DI -> 2 beyond 8 -> 0.2 penalty; raw 53 - 3.25 = 49.75
    expect(r.unattempted).toBe(10);
    expect(r.penalty).toBe(0.2);
    expect(r.total).toBe(49.55);
  });

  it("GK has no negative marking and is not part of the total", () => {
    const r = scoreXatManual({ VALR: { correct: 0, wrong: 0 }, DM: { correct: 0, wrong: 0 }, QADI: { correct: 0, wrong: 0 }, GK: { correct: 10, wrong: 8 } }, pattern);
    expect(r.gk.score).toBe(10);
    expect(r.raw).toBe(0);
  });

  it("maps response-sheet section names", () => {
    expect(xatSectionKey("Verbal and Logical Ability")).toBe("VALR");
    expect(xatSectionKey("Decision Making")).toBe("DM");
    expect(xatSectionKey("Quantitative Ability and Data Interpretation")).toBe("QADI");
    expect(xatSectionKey("General Knowledge")).toBe("GK");
  });

  it("answers without a key are not counted as wrong", () => {
    const s = scoreXatQuestions([q("VALR", "Answered", false, null), q("VALR", "Answered", true), q("VALR", "Answered", false)]);
    expect(s.part1.correct).toBe(1);
    expect(s.part1.incorrect).toBe(1);
    expect(s.part1.rawScore).toBe(0.75);
  });
});
