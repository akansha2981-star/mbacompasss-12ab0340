// Pure helpers for the Meritto background bulk upload (shared by the edge
// function and unit tests).

/** Next 00:00 in India (UTC+5:30) plus one minute, when Meritto's daily allowance resets. */
export function nextIstMidnight(now = new Date()): string {
  const ist = new Date(now.getTime() + 330 * 60_000);
  const midnightUtc = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + 1) - 330 * 60_000;
  return new Date(midnightUtc + 60_000).toISOString();
}

/**
 * True when Meritto's reply means the daily lead allowance is used up.
 * Meritto's exact wording is unconfirmed, so any HTTP 429 or a message about a
 * limit / quota / exceeded allowance counts; field-length validation errors do not.
 */
// deno-lint-ignore no-explicit-any
export function isDailyLimit(status: number, json: any): boolean {
  if (status === 429) return true;
  const msg = `${json?.message ?? ""} ${json?.status ?? ""} ${json?.raw ?? ""}`.toLowerCase();
  return /limit|quota|exceed/.test(msg) && !/character|length/.test(msg);
}
