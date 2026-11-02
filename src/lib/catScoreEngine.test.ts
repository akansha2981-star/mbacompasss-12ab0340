import { describe, it, expect } from "vitest";
import { scoreSection, validateSection, interpolatePercentile, DEFAULT_CAT_SETTINGS, isAllowedResponseSheetUrl } from "./catScoreEngine";

describe("CAT scoring", () => {
  it("20 correct + 4 wrong MCQ + 2 wrong TITA = 56 marks", () => {
    const r = scoreSection("VARC", { correct: 20, wrongMcq: 4, wrongTita: 2 });
    expect(r.score).toBe(56);
    expect(r.unattempted).toBe(24 - 26 < 0 ? 0 : 24 - 26);
  });
  it("wrong TITA carries no negative marking", () => {
    expect(scoreSection("QA", { correct: 0, wrongMcq: 0, wrongTita: 5 }).score).toBe(0);
  });
  it("unattempted is auto-calculated", () => {
    expect(scoreSection("DILR", { correct: 10, wrongMcq: 2, wrongTita: 1 }).unattempted).toBe(9);
  });
  it("rejects totals above the section question count", () => {
    expect(validateSection("DILR", { correct: 20, wrongMcq: 2, wrongTita: 1 })).not.toBeNull();
    expect(validateSection("VARC", { correct: 20, wrongMcq: 4, wrongTita: 0 })).toBeNull();
  });
});

describe("percentile model", () => {
  it("returns seeded points exactly", () => {
    expect(interpolatePercentile(DEFAULT_CAT_SETTINGS.overall, 85)).toBe(99);
    expect(interpolatePercentile(DEFAULT_CAT_SETTINGS.overall, 64)).toBe(95);
  });
  it("interpolates between points", () => {
    expect(interpolatePercentile(DEFAULT_CAT_SETTINGS.overall, 50)).toBe(87.5);
  });
  it("returns null without enough points", () => {
    expect(interpolatePercentile([], 50)).toBeNull();
  });
});

describe("response sheet link host", () => {
  it("accepts official hosts", () => {
    expect(isAllowedResponseSheetUrl("https://cdn.digialm.com/per/g28/pub/abc.html")).toBe(true);
  });
  it("blocks other and look-alike hosts", () => {
    expect(isAllowedResponseSheetUrl("https://evil.com/cdn.digialm.com")).toBe(false);
    expect(isAllowedResponseSheetUrl("https://digialm.com.evil.com/x")).toBe(false);
    expect(isAllowedResponseSheetUrl("http://169.254.169.254/latest")).toBe(false);
    expect(isAllowedResponseSheetUrl("https://user@cdn.digialm.com/x")).toBe(false);
  });
});
