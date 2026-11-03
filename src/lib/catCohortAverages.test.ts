import { describe, expect, it } from "vitest";
import { cohortAverages } from "./catCohortAverages";

describe("cohortAverages", () => {
  it("averages the top 10/25/50 percent and everyone", () => {
    const scores = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(cohortAverages(scores)).toEqual({ top10: 100, top25: 90, top50: 80, overall: 55 });
  });
  it("returns nulls with no submissions", () => {
    expect(cohortAverages([]).overall).toBeNull();
  });
});
