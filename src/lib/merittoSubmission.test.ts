import { describe, expect, it, vi } from "vitest";
import { readMerittoFailure, submitMerittoWithWait } from "./merittoSubmission";

function httpError(status: number, body: object, headers?: HeadersInit) {
  return Object.assign(new Error("Edge Function returned a non-2xx status code"), {
    context: new Response(JSON.stringify(body), { status, headers }),
  });
}

describe("Meritto submissions", () => {
  it("waits 61 seconds then retries a confirmed pre-dispatch 429", async () => {
    const invoke = vi.fn()
      .mockResolvedValueOnce({ data: null, error: httpError(429, { error: "Too many requests" }) })
      .mockResolvedValueOnce({ data: { ok: true, outcome: "success" }, error: null });
    const wait = vi.fn().mockResolvedValue(undefined);
    const notify = vi.fn();
    expect((await submitMerittoWithWait(invoke, notify, wait)).data.ok).toBe(true);
    expect(wait).toHaveBeenCalledWith(61000);
    expect(notify).toHaveBeenCalledWith(61);
    expect(invoke).toHaveBeenCalledTimes(2);
  });
  it("honours the function's Retry-After", async () => {
    const failure = await readMerittoFailure(httpError(429, { error: "Too many requests" }, { "Retry-After": "12" }));
    expect(failure.retryAfterSeconds).toBe(12);
  });
  it("shows validation errors without retrying", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: null, error: httpError(400, { error: "Invalid email format" }) });
    const wait = vi.fn();
    const result = await submitMerittoWithWait(invoke, undefined, wait);
    expect((result.error as Error).message).toBe("Invalid email format");
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });
  it("never retries uncertain network errors or provider failures", async () => {
    for (const result of [
      { data: null, error: new Error("Failed to fetch") },
      { data: { ok: false, status: 429, outcome: "failed" }, error: null },
      { data: null, error: httpError(500, { error: "Network failure" }) },
    ]) {
      const invoke = vi.fn().mockResolvedValue(result);
      await submitMerittoWithWait(invoke, undefined, vi.fn());
      expect(invoke).toHaveBeenCalledTimes(1);
    }
  });
  it("stops after three safe retries", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: null, error: httpError(429, { error: "Too many requests" }) });
    const result = await submitMerittoWithWait(invoke, undefined, vi.fn().mockResolvedValue(undefined));
    expect(invoke).toHaveBeenCalledTimes(4);
    expect((result.error as Error).message).toBe("Too many requests");
  });
});