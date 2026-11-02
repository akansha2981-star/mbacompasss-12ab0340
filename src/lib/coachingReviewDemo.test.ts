import { describe, expect, it } from "vitest";
import { getDemoCoachingReport } from "./coachingReviewDemo";

describe("isolated coaching demo fixtures", () => {
  it.each([
    ["catking", 70, 70], ["time", 81, 27], ["iquanta", 65, 63],
    ["ims", 94, 17], ["mindworks", 46, 87], ["cracku", 98, 54],
  ])("%s uses 41–98 reviews and the requested sentiment mix", (slug, count, percent) => {
    const report = getDemoCoachingReport(String(slug));
    expect(report.stats.total_reviews).toBe(count);
    expect(count).toBeGreaterThanOrEqual(41);
    expect(count).toBeLessThanOrEqual(98);
    const reviews = Array.from({ length: Math.ceil(Number(count) / 10) }, (_, p) =>
      getDemoCoachingReport(String(slug), "recent", "", p + 1).reviews).flat();
    expect(reviews.filter((r) => Number(r.average_rating) < 5)).toHaveLength(Math.round(Number(count) * Number(percent) / 100));
    expect(new Set(reviews.map((r) => r.id)).size).toBe(count);
    expect(reviews.every((r) => r.id?.startsWith("demo-") && r.review_comment?.startsWith("DEMO"))).toBe(true);
  });
  it("filters and sorts demo rows without including other exams", () => {
    const report = getDemoCoachingReport("cracku", "highest", "XAT");
    expect(report.totalMatching).toBe(25);
    expect(report.reviews.every((r) => r.exam_category === "XAT")).toBe(true);
    expect(Number(report.reviews[0]?.average_rating)).toBeGreaterThanOrEqual(Number(report.reviews[9]?.average_rating));
    expect(getDemoCoachingReport("cracku", "recent", "", 10).reviews).toHaveLength(8);
  });
});