import { matchesFeeBucket, locationMatches } from "./filterHelpers";

/**
 * Coaching category membership and the shared location / fee / minimum-rating
 * filters used by /coaching and /category/:slug.
 *
 * An institute belongs to a category when it is linked by category_id or when
 * one of its own course records names the category's exam. Most listings carry
 * no category_id, so linking alone left every category empty.
 */

export type CoachingCategoryRecord = { id: string; slug: string; name?: string | null; exam_type?: string | null };

const EXTRA_TERMS: Record<string, string[]> = {
  interview: ["interview", "gd-pi", "gdpi", "gd/pi"],
};

export function categoryTerms(category: CoachingCategoryRecord): string[] {
  const terms = new Set<string>();
  for (const part of String(category.slug || "").toLowerCase().split("-")) if (part) terms.add(part);
  const exam = String(category.exam_type || "").trim().toLowerCase();
  if (exam) terms.add(exam);
  for (const t of [...terms]) for (const extra of EXTRA_TERMS[t] || []) terms.add(extra);
  return [...terms];
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

export function instituteMatchesCategory(row: any, category: CoachingCategoryRecord): boolean {
  if (row?.category_id && row.category_id === category.id) return true;
  const terms = categoryTerms(category);
  if (!terms.length) return false;
  const text = [
    row?.name,
    ...(row?.courses || []).map((c: any) => c?.name),
    ...(Array.isArray(row?.specializations) ? row.specializations : []),
  ].filter(Boolean).join(" | ");
  const re = new RegExp(`(^|[^a-z0-9])(${terms.map(escapeRegExp).join("|")})([^a-z0-9]|$)`, "i");
  return re.test(text);
}

/**
 * Fee used for coaching filters and fee sorting: the cheapest priced course
 * (the "from" figure listing cards show), else the institute's fees_lakhs.
 */
export function coachingFeeLakhs(row: any): number | null {
  const fees = (row?.courses || [])
    .map((c: any) => Number(String(c?.fees ?? "").replace(/[^0-9.]/g, "")))
    .filter((n: number) => Number.isFinite(n) && n > 0);
  if (fees.length) return Math.min(...fees) / 100000;
  return row?.fees_lakhs != null && Number(row.fees_lakhs) > 0 ? Number(row.fees_lakhs) : null;
}

export const MIN_RATING_OPTIONS = [
  { value: "4.5", label: "4.5+ ★" },
  { value: "4", label: "4.0+ ★" },
  { value: "3.5", label: "3.5+ ★" },
];

export function matchesMinRating(row: any, minRating: string | null | undefined): boolean {
  if (!minRating || minRating === "all") return true;
  const min = parseFloat(minRating);
  if (Number.isNaN(min)) return true;
  return Number(row?.rating || 0) >= min;
}

export type CoachingFilterInput = {
  state?: string;
  city?: string;
  cityAliases?: string[] | null;
  fee?: string;
  minRating?: string;
};

/** Location (state + city), fee range and minimum rating — all must match. */
export function applyCoachingFilters<T>(rows: T[], f: CoachingFilterInput): T[] {
  const state = f.state && f.state !== "all" ? f.state.trim().toLowerCase() : "";
  return rows.filter((row: any) => {
    if (state && String(row.state || "").trim().toLowerCase() !== state) return false;
    if (f.city && f.city !== "all" && !locationMatches(row.city, f.city, f.cityAliases)) return false;
    if (f.fee && f.fee !== "all" && !matchesFeeBucket(coachingFeeLakhs(row), f.fee)) return false;
    if (!matchesMinRating(row, f.minRating)) return false;
    return true;
  });
}
