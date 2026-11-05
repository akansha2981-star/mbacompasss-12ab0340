import { describe, it, expect } from "vitest";
import { normalizeUrl, buildFinalUrl, campaignName, shouldTrack, growthPct, rangeBounds } from "./utmEngine";

describe("utm engine", () => {
  it("treats cosmetic variants of the same destination as one link", () => {
    const a = normalizeUrl("https://www.College.com/apply/?b=2&a=1&utm_source=x#top");
    const b = normalizeUrl("http://college.com/apply?a=1&b=2");
    expect(a).toBe("https://college.com/apply?a=1&b=2");
    expect(b).toBe(a);
  });

  it("keeps different pages distinct", () => {
    expect(normalizeUrl("https://college.com/apply")).not.toBe(normalizeUrl("https://college.com/fees"));
  });

  it("builds the standard campaign name", () => {
    expect(campaignName("mba_compass", "college_application", "2027")).toBe("mba_compass_college_application_2027");
  });

  it("replaces existing UTM params on the final URL", () => {
    const u = new URL(buildFinalUrl("https://college.com/apply?utm_source=old&x=1", { utm_source: "mba_compass", utm_medium: "website", utm_campaign: "c" }));
    expect(u.searchParams.get("utm_source")).toBe("mba_compass");
    expect(u.searchParams.get("x")).toBe("1");
  });

  it("does not wrap our own or social links", () => {
    expect(shouldTrack("https://mbacompass.in/colleges")).toBe(false);
    expect(shouldTrack("https://www.instagram.com/x")).toBe(false);
    expect(shouldTrack("https://iimb.ac.in/apply")).toBe(true);
  });

  it("growth needs earlier traffic", () => {
    expect(growthPct(30, 10)).toBe(200);
    expect(growthPct(5, 0)).toBeNull();
  });

  it("today starts at IST midnight", () => {
    const { from } = rangeBounds("today", new Date("2026-11-05T15:00:00Z"));
    expect(from).toBe("2026-11-04T18:30:00.000Z");
  });
});

import { needsUtmPrompt } from "./utmEngine";
describe("needsUtmPrompt", () => {
  it("prompts for a plain external URL", () => expect(needsUtmPrompt("https://www.iimb.ac.in/admissions")).toBe(true));
  it("skips URLs that already carry UTM params", () => expect(needsUtmPrompt("https://iimb.ac.in/?utm_source=mbacompass")).toBe(false));
  it("skips our own tracking links", () => expect(needsUtmPrompt("https://mbacompass.in/go/abc123")).toBe(false));
  it("skips normal text", () => expect(needsUtmPrompt("hello world")).toBe(false));
});
