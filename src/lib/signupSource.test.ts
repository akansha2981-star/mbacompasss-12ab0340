import { describe, expect, it } from "vitest";
import { resolveSignupPage, shouldApplySignupSource } from "./signupSource";

const origin = "https://mbacompass.in";

describe("which page a Google sign-up is credited to", () => {
  it("credits the page the Google button was on", () => {
    expect(resolveSignupPage({ current: "/college/great-lakes-institute-of-management-gurgaon", title: "Great Lakes Gurgaon", origin })).toEqual({ url: "/college/great-lakes-institute-of-management-gurgaon", name: "Great Lakes Gurgaon" });
  });
  it("on the sign-in page, credits the page the visitor came from", () => {
    expect(resolveSignupPage({ current: "/auth", title: "Sign In", from: "/cat-score-calculator", origin }).url).toBe("/cat-score-calculator");
  });
  it("falls back to a same-site referrer on the sign-in page", () => {
    expect(resolveSignupPage({ current: "/student/login", title: "Login", referrer: "https://mbacompass.in/mocks?x=1", origin }).url).toBe("/mocks?x=1");
  });
  it("ignores referrers from other websites", () => {
    expect(resolveSignupPage({ current: "/auth", title: "Sign In", referrer: "https://google.com/search", origin }).url).toBe("/auth");
  });
});

describe("saving the page only for new accounts", () => {
  const now = Date.parse("2026-11-19T10:00:00Z");
  const src = { url: "/mocks", name: "Mocks", at: now - 60_000 };
  it("saves it for an account created 2 minutes ago", () => {
    expect(shouldApplySignupSource(src, "2026-11-19T09:58:00Z", now)).toBe("apply");
  });
  it("does not credit a page to an existing account signing in", () => {
    expect(shouldApplySignupSource(src, "2026-10-01T09:58:00Z", now)).toBe("discard");
  });
  it("drops a page remembered more than 2 hours ago", () => {
    expect(shouldApplySignupSource({ ...src, at: now - 3 * 60 * 60 * 1000 }, "2026-11-19T09:59:00Z", now)).toBe("discard");
  });
});
