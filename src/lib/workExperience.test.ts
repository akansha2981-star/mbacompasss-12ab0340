import { describe, it, expect } from "vitest";
import { WORK_EXPERIENCE_OPTIONS, isWorkExperience } from "./workExperience";
describe("work experience", () => {
  it("offers exactly the seven requested bands", () => {
    expect(WORK_EXPERIENCE_OPTIONS).toEqual(["Fresher", "1 - 6 Months", "7 - 12 Months", "12 - 18 Months", "18 - 24 Months", "24 - 36 Months", "36+ Months"]);
  });
  it("rejects empty or unknown values", () => {
    expect(isWorkExperience("")).toBe(false);
    expect(isWorkExperience("5 years")).toBe(false);
    expect(isWorkExperience("Fresher")).toBe(true);
  });
});
