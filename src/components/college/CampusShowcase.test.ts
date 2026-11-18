import { describe, expect, it } from "vitest";
import { daysLeftIst, parseCampusShowcase, programmeCtcLines } from "./CampusShowcase";

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

describe("programme-wise headline packages", () => {
  const reports = parseCampusShowcase({
    placement_reports: [
      { code: "PGDM", title: "PGDM placements 2026", highest: "40 LPA", average: "15 LPA" },
      { code: "PGPM", title: "PGPM placements 2026", highest: "43 LPA", average: "18.1 LPA" },
    ],
  });
  it("lists PGDM 40 LPA and PGPM 43 LPA as highest packages", () => {
    expect(programmeCtcLines(reports, "highest")).toEqual([{ code: "PGDM", value: "₹40 L" }, { code: "PGPM", value: "₹43 L" }]);
  });
  it("lists PGPM average alongside PGDM average", () => {
    expect(programmeCtcLines(reports, "average")).toEqual([{ code: "PGDM", value: "₹15 L" }, { code: "PGPM", value: "₹18.1 L" }]);
  });
  it("returns nothing when only one programme reports the figure", () => {
    expect(programmeCtcLines(parseCampusShowcase({ placement_reports: [{ code: "PGDM", title: "t", highest: "24 LPA" }] }), "highest")).toEqual([]);
  });
});
