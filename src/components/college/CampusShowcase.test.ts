import { describe, expect, it } from "vitest";
import { daysLeftIst, parseCampusShowcase } from "./CampusShowcase";

describe("programme deadline countdown (IST calendar)", () => {
  it("counts 10 days from 16 Nov 2026 to a 26 Nov 2026 deadline", () => {
    expect(daysLeftIst("2026-11-26", new Date("2026-11-16T14:00:00Z"))).toBe(10);
  });
  it("rolls to the next India day after 18:30 UTC", () => {
    expect(daysLeftIst("2026-11-26", new Date("2026-11-16T19:00:00Z"))).toBe(9);
  });
  it("reports a passed deadline as negative", () => {
    expect(daysLeftIst("2026-11-20", new Date("2026-11-21T06:00:00Z"))).toBe(-1);
  });
});

describe("campus showcase links", () => {
  it("drops non-https apply links and non-asset brochure URLs", () => {
    const d = parseCampusShowcase({
      programme_groups: [{ group: "Full Time", programmes: [{ code: "PGDM", apply_url: "javascript:alert(1)", learn_url: "https://x.edu/pgdm" }] }],
      brochures: [{ title: "Brochure", url: "http://evil.example/file.pdf" }],
    });
    expect(d?.programme_groups?.[0].programmes[0].apply_url).toBe("");
    expect(d?.programme_groups?.[0].programmes[0].learn_url).toBe("https://x.edu/pgdm");
    expect(d?.brochures).toHaveLength(0);
  });
});
