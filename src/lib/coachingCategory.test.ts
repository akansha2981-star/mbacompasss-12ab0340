import { describe, expect, it } from "vitest";
import { applyCoachingFilters, categoryTerms, coachingFeeLakhs, instituteMatchesCategory } from "./coachingCategory";

const cat = { id: "c-cat", slug: "cat", exam_type: "CAT" };
const xatSnap = { id: "c-xs", slug: "xat-snap", exam_type: "XAT" };
const matCmat = { id: "c-mc", slug: "mat-cmat", exam_type: "MAT" };
const interview = { id: "c-int", slug: "interview", exam_type: "Interview" };

const ims = { id: "1", name: "IMS", city: "Mumbai", state: "Maharashtra", rating: 4.7, fees_lakhs: 0.65, category_id: null, courses: [{ name: "CAT Classroom", fees: 55000 }, { name: "SimCAT", fees: 6000 }] };
const vprov = { id: "2", name: "VPROV", city: "Mumbai", state: "Maharashtra", rating: 4.5, fees_lakhs: null, category_id: null, courses: [{ name: "CAT Classroom Program", fees: 62000 }] };
const delhi = { id: "3", name: "Studycopter", city: "Delhi", state: "Delhi", rating: 4.5, fees_lakhs: null, category_id: null, courses: [{ name: "GD-PI-WAT Prep", fees: 12000 }] };
const pricey = { id: "4", name: "Elite", city: "Mumbai", state: "Maharashtra", rating: 4.8, fees_lakhs: null, category_id: null, courses: [{ name: "CMAT Program", fees: 150000 }] };

describe("coaching category membership", () => {
  it("counts an institute linked by category_id even without matching courses", () => {
    expect(instituteMatchesCategory({ category_id: "c-cat", courses: [] }, cat)).toBe(true);
  });
  it("counts an unlinked institute whose course names the category exam", () => {
    expect(instituteMatchesCategory(ims, cat)).toBe(true);
  });
  it("does not treat CMAT or SimCAT as a CAT course on their own", () => {
    expect(instituteMatchesCategory({ courses: [{ name: "CMAT Program" }] }, cat)).toBe(false);
  });
  it("matches either exam of a combined XAT & SNAP category", () => {
    expect(instituteMatchesCategory({ courses: [{ name: "SNAP Crash" }] }, xatSnap)).toBe(true);
  });
  it("matches CMAT courses for the MAT & CMAT category", () => {
    expect(instituteMatchesCategory(pricey, matCmat)).toBe(true);
  });
  it("matches GD-PI courses for Interview Prep", () => {
    expect(categoryTerms(interview)).toContain("gd-pi");
    expect(instituteMatchesCategory(delhi, interview)).toBe(true);
  });
});

describe("coaching filters", () => {
  it("uses the cheapest priced course as the coaching fee", () => {
    expect(coachingFeeLakhs(ims)).toBeCloseTo(0.06);
  });
  it("applies location, fee and minimum rating together", () => {
    const rows = [ims, vprov, delhi, pricey];
    const out = applyCoachingFilters(rows, { state: "Maharashtra", city: "Mumbai", fee: "under-1l", minRating: "4.6" });
    expect(out.map((r) => r.id)).toEqual(["1"]);
  });
  it("keeps a 4.5-rated institute for a 4.5+ minimum", () => {
    const out = applyCoachingFilters([vprov], { minRating: "4.5" });
    expect(out).toHaveLength(1);
  });
  it("excludes institutes with no priced course from a fee range", () => {
    const out = applyCoachingFilters([{ id: "5", courses: [], fees_lakhs: null, rating: 5 }], { fee: "under-1l" });
    expect(out).toHaveLength(0);
  });
});
