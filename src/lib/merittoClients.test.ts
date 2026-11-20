import { describe, expect, it } from "vitest";
import { ABBS_MERITTO_COURSE, ABBS_MERITTO_SPECIALIZATIONS, canonicalSpecialization, merittoClientFieldError } from "./merittoClients";

describe("Meritto client required fields", () => {
  it("ABBS leads without a specialization are stopped before sending", () => {
    expect(merittoClientFieldError("abbs", { specialization: "" })).toBe("Specialization is required");
    expect(merittoClientFieldError("abbs", {})).toBe("Specialization is required");
  });
  it("ABBS leads with one of its specializations pass", () => {
    expect(merittoClientFieldError("abbs", { specialization: "PGDM-Fintech & Wealth Management" })).toBeNull();
  });
  it("ABBS leads with an unknown specialization are stopped", () => {
    expect(merittoClientFieldError("abbs", { specialization: "Marketing" })).toBe("Specialization is not one of ABBS's options");
  });
  it("GIM leads do not need a specialization", () => {
    expect(merittoClientFieldError("gim", {})).toBeNull();
  });
});

describe("ABBS specialization values", () => {
  it("lists the 10 ABBS PGDM specializations under Post Graduate Programs", () => {
    expect(ABBS_MERITTO_COURSE).toBe("Post Graduate Programs");
    expect(ABBS_MERITTO_SPECIALIZATIONS).toHaveLength(10);
  });
  it("maps loosely typed CSV values to ABBS's exact spelling", () => {
    expect(canonicalSpecialization("abbs", "pgdm - business analytics, ai & decision sciences")).toBe("PGDM- Business Analytics, AI & Decision Sciences");
    expect(canonicalSpecialization("abbs", "PGDM- Digital Business & Martech")).toBe("PGDM-Digital Business & Martech");
  });
});
