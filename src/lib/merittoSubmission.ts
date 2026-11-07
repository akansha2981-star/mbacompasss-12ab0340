type Invocation = { data: any; error: unknown };
type Failure = { message: string; status?: number; retryAfterSeconds: number };

export async function readMerittoFailure(error: unknown): Promise<Failure> {
  const fallback = error instanceof Error ? error.message : "Could not submit the lead";
  const context = error && typeof error === "object" && "context" in error ? error.context : null;
  if (!(context instanceof Response)) return { message: fallback, retryAfterSeconds: 61 };
  let body: Record<string, unknown> = {};
  try { body = await context.clone().json(); } catch { /* Keep the HTTP error if no JSON was returned. */ }
  const delay = Number(context.headers.get("Retry-After") ?? body.retry_after_seconds);
  return {
    message: typeof body.error === "string" ? body.error : fallback,
    status: context.status,
    retryAfterSeconds: Number.isFinite(delay) && delay > 0 ? Math.max(1, Math.ceil(delay)) : 61,
  };
}

// Only a confirmed function-level 429 is safe to retry: the lead was never dispatched.
export async function submitMerittoWithWait(
  invoke: () => Promise<Invocation>,
  onWait?: (seconds: number) => void,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<Invocation> {
  for (let attempt = 0; ; attempt++) {
    const result = await invoke();
    if (!result.error) return result;
    const failure = await readMerittoFailure(result.error);
    if (failure.status !== 429 || attempt >= 3) {
      return { data: result.data, error: new Error(failure.message) };
    }
    onWait?.(failure.retryAfterSeconds);
    await wait(failure.retryAfterSeconds * 1000);
  }
}