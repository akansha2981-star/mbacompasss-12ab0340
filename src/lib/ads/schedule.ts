/** Smart delivery must respect both the booked schedule and the goal deadline. */
export function smartDeliverySchedule(endAt?: string | null, goalEndAt?: string | null) {
  const deadlines = [endAt, goalEndAt].filter((value): value is string => !!value);
  const end_at = deadlines.sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null;
  return { end_at, pacing: end_at ? "even" as const : "asap" as const };
}

type Schedule = { end_at?: string | null; goal_end_at?: string | null; smart_mode?: boolean };

/** Dates previously saved as one deadline stay linked during explicit edits. */
export function editAdDeadline(schedule: Schedule, key: "end_at" | "goal_end_at", value: string | null) {
  const other = key === "end_at" ? "goal_end_at" : "end_at";
  const linked = schedule.smart_mode && schedule.end_at && schedule.goal_end_at
    && Date.parse(schedule.end_at) === Date.parse(schedule.goal_end_at);
  return linked ? { [key]: value, [other]: value } : { [key]: value };
}

/** Explicit extension moves any limiting goal as well, without changing status or budgets. */
export function extendAdSchedule(schedule: Schedule, extraDays: number, now: number) {
  const effectiveEnd = schedule.smart_mode
    ? smartDeliverySchedule(schedule.end_at, schedule.goal_end_at).end_at : schedule.end_at;
  const parsed = effectiveEnd ? Date.parse(effectiveEnd) : now;
  const base = Number.isFinite(parsed) ? Math.max(now, parsed) : now;
  const end_at = new Date(base + extraDays * 86400_000).toISOString();
  const goalLimits = schedule.smart_mode && schedule.goal_end_at
    && Date.parse(schedule.goal_end_at) < Date.parse(end_at);
  return { end_at, ...(goalLimits ? { goal_end_at: end_at } : {}) };
}

/** datetime-local is local wall time, not a sliced UTC ISO string. */
export function adLocalDateTime(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}