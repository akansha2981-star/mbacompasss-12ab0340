import { describe, expect, it } from "vitest";
import { adLocalDateTime, editAdDeadline, extendAdSchedule, smartDeliverySchedule } from "./schedule";
import { eligible, type AdCampaign } from "./engine";

describe("smart advertisement schedule", () => {
  const bookedEnd = "2026-10-31T18:30:00.000Z";
  it("preserves the booked October 31 end when the goal date is blank", () => {
    expect(smartDeliverySchedule(bookedEnd, null)).toEqual({ end_at: bookedEnd, pacing: "even" });
  });
  it("never extends a booked end to a later goal date", () => {
    expect(smartDeliverySchedule(bookedEnd, "2026-11-05T18:30:00.000Z").end_at).toBe(bookedEnd);
  });
  it("honors an earlier goal deadline", () => {
    expect(smartDeliverySchedule(bookedEnd, "2026-10-25T18:30:00.000Z").end_at).toBe("2026-10-25T18:30:00.000Z");
  });
  it("uses the goal deadline when no schedule end exists", () => {
    expect(smartDeliverySchedule(null, bookedEnd).end_at).toBe(bookedEnd);
  });
  it("remains open-ended only when both dates are absent", () => {
    expect(smartDeliverySchedule(null, null)).toEqual({ end_at: null, pacing: "asap" });
  });
});

describe("advertisement deadline extensions", () => {
  const old = "2026-10-22T13:09:00.000Z";
  const next = "2026-11-06T13:09:00.000Z";
  const now = Date.parse("2026-10-30T06:25:00.000Z");
  const schedule = { smart_mode: true, end_at: old, goal_end_at: old };
  it("changing End updates the matching old goal so saving cannot undo the extension", () => {
    const changed = { ...schedule, ...editAdDeadline(schedule, "end_at", next) };
    expect(changed.goal_end_at).toBe(next);
    expect(smartDeliverySchedule(changed.end_at, changed.goal_end_at).end_at).toBe(next);
  });
  it("changing a matching goal also advances the end", () => {
    expect(editAdDeadline(schedule, "goal_end_at", next)).toEqual({ goal_end_at: next, end_at: next });
  });
  it("preserves an independently chosen earlier goal", () => {
    expect(editAdDeadline({ ...schedule, end_at: next }, "end_at", "2026-11-10T13:09:00.000Z")).toEqual({ end_at: "2026-11-10T13:09:00.000Z" });
  });
  it("seven-day extension advances both expired deadlines from now and survives another save", () => {
    const patch = extendAdSchedule(schedule, 7, now);
    expect(patch).toEqual({ end_at: "2026-11-06T06:25:00.000Z", goal_end_at: "2026-11-06T06:25:00.000Z" });
    expect(smartDeliverySchedule(patch.end_at, patch.goal_end_at).end_at).toBe(patch.end_at);
    const ad = { ...schedule, ...patch, id: "gim", status: "active", start_at: null, cap_per_day: 0, cap_per_session: 0 } as AdCampaign;
    expect(eligible(ad, { path: "/", pageType: "home", device: "desktop", text: "", caps: {}, today: "2026-10-30", now })).toBe(true);
  });
  it("does not reactivate paused campaigns or alter their view budget", () => {
    const ad = { ...schedule, status: "paused", impression_budget: 20000 };
    const extended = { ...ad, ...extendAdSchedule(ad, 7, now) };
    expect(extended.status).toBe("paused");
    expect(extended.impression_budget).toBe(20000);
  });
  it("extends a future end from that end and leaves a later goal intact", () => {
    expect(extendAdSchedule({ ...schedule, end_at: next, goal_end_at: "2026-12-01T00:00:00.000Z" }, 7, now)).toEqual({ end_at: "2026-11-13T13:09:00.000Z" });
  });
  it("round-trips the displayed local date without shifting its time", () => {
    expect(new Date(adLocalDateTime(old)).toISOString()).toBe(old);
  });
});