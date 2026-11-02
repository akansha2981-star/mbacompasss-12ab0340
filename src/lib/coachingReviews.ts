// Shared constants, validation and helpers for the "Rate Your Coaching Institute" platform.

import { z } from "zod";

export const RATING_PARAMETERS = [
  { key: "teaching_quality", label: "Teaching Quality", description: "Faculty knowledge, teaching methods, and conceptual clarity" },
  { key: "live_classes", label: "Live Classes", description: "Quality of live lectures, interaction, and class experience" },
  { key: "recorded_lectures", label: "Recorded Lectures", description: "Quality, accessibility, and usefulness of recorded content" },
  { key: "study_material", label: "Study Material", description: "Quality of notes, modules, practice questions, and resources" },
  { key: "mock_tests", label: "Mock Tests", description: "Quality of mock tests, difficulty level, and exam relevance" },
  { key: "doubt_solving", label: "Doubt Solving Support", description: "Speed and effectiveness of doubt resolution" },
  { key: "student_support", label: "Student Support", description: "Helpfulness of the academic and non-academic support team" },
  { key: "mentorship", label: "Mentorship & Guidance", description: "Personal mentorship, strategy, and preparation guidance" },
  { key: "value_for_money", label: "Value for Money", description: "Quality of education relative to the fees paid" },
  { key: "overall_experience", label: "Overall Experience", description: "Overall satisfaction with the coaching institute" },
] as const;

export type RatingParameterKey = (typeof RATING_PARAMETERS)[number]["key"];

export const EXAM_CATEGORIES = ["CAT", "XAT", "NMAT", "SNAP", "Other"] as const;
export const CLASS_MODES = ["Online", "Offline", "Hybrid"] as const;

/** Normalize an institute name for matching: lowercase alphanumerics only. */
export function normalizeInstituteName(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function instituteSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "institute";
}

export type RatingsMap = Record<RatingParameterKey, number>;

/** Average of the 10 parameter ratings, rounded to one decimal. */
export function computeAverageRating(ratings: RatingsMap): number {
  const sum = RATING_PARAMETERS.reduce((acc, p) => acc + (ratings[p.key] ?? 0), 0);
  return Math.round((sum / RATING_PARAMETERS.length) * 10) / 10;
}

const ratingValue = z.number().int().min(1, "Rate 1 to 10").max(10, "Rate 1 to 10");

const ratingsSchema = z.object(
  Object.fromEntries(RATING_PARAMETERS.map((p) => [p.key, ratingValue])) as Record<RatingParameterKey, typeof ratingValue>,
);

export const reviewSubmissionSchema = z
  .object({
    studentName: z.string().trim().min(2, "Please enter your name").max(100, "Name is too long"),
    studentEmail: z
      .string()
      .trim()
      .max(255, "Email is too long")
      .regex(/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/, "Please enter a valid email address"),
    instituteId: z.string().uuid().nullish(),
    newInstituteName: z.string().trim().min(2).max(120).nullish(),
    originalInstituteInput: z.string().trim().max(120).nullish(),
    examCategory: z.enum(EXAM_CATEGORIES).nullish(),
    preparationYear: z.string().trim().max(20).nullish(),
    classMode: z.enum(CLASS_MODES).nullish(),
    ratings: ratingsSchema,
    reviewComment: z
      .string()
      .trim()
      .min(30, "Please write at least 30 characters about your experience")
      .max(2000, "Please keep your review under 2,000 characters")
      .refine((v) => !/<\s*(script|iframe|object|embed)|javascript:/i.test(v), "HTML and scripts are not allowed in reviews"),
    confirmGenuine: z.literal(true, { error: "Please confirm your review is based on your genuine experience" }),
  })
  .refine((v) => v.instituteId || v.newInstituteName, {
    message: "Please select or add your coaching institute",
    path: ["instituteId"],
  });

export type ReviewSubmission = z.infer<typeof reviewSubmissionSchema>;

/** Strip HTML tags from review text so stored reviews are always plain text. */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Escape a CSV cell and neutralize spreadsheet formula injection (=, +, -, @, tab, CR). */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  return lines.join("\r\n");
}

export const REVIEW_STATUSES = ["pending", "approved", "rejected", "flagged"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export type InstituteMatch = {
  id: string;
  canonical_name: string;
  slug: string;
  matched_alias: string | null;
  score: number;
};

export type InstituteMatchResult = {
  originalInput: string;
  normalizedName: string;
  matchedInstituteId: string | null;
  canonicalName: string | null;
  confidence: number;
  method: "exact_alias" | "fuzzy" | "ai_semantic" | "none";
  candidates: InstituteMatch[];
};
