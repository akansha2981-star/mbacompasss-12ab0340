import { describe, expect, it } from "vitest";
import { isDailyLimit, nextIstMidnight } from "./merittoBulk";

describe("Meritto bulk upload restart time", () => {
  it("restarts just after 12 AM India time the next night (evening)", () => {
    // 17:19 IST on 13 Nov 2026
    expect(nextIstMidnight(new Date("2026-11-13T11:49:00Z"))).toBe("2026-11-13T18:31:00.000Z"); // 00:01 IST 14 Nov
  });
  it("after midnight IST, waits for the following midnight, not the same one", () => {
    // 00:30 IST on 14 Nov 2026
    expect(nextIstMidnight(new Date("2026-11-13T19:00:00Z"))).toBe("2026-11-14T18:31:00.000Z"); // 00:01 IST 15 Nov
  });
});

describe("Meritto daily limit detection", () => {
  it("pauses on HTTP 429", () => expect(isDailyLimit(429, null)).toBe(true));
  it("pauses on a limit message", () => expect(isDailyLimit(200, { status: "error", message: "Daily limit reached" })).toBe(true));
  it("pauses on a quota message", () => expect(isDailyLimit(200, { message: "Quota exceeded for today" })).toBe(true));
  it("does not pause on a field-length error", () => expect(isDailyLimit(200, { message: "Name exceeds character limit" })).toBe(false));
  it("does not pause on duplicate leads", () => expect(isDailyLimit(200, { status: "duplicate", message: "Already registered" })).toBe(false));
  it("does not pause on success", () => expect(isDailyLimit(200, { status: "success" })).toBe(false));
});
