/** Work-experience bands collected (mandatory) on the CAT and XAT score calculators. */
export const WORK_EXPERIENCE_OPTIONS = [
  "Fresher", "1 - 6 Months", "7 - 12 Months", "12 - 18 Months", "18 - 24 Months", "24 - 36 Months", "36+ Months",
] as const;
export type WorkExperience = (typeof WORK_EXPERIENCE_OPTIONS)[number];
export const isWorkExperience = (v: unknown): v is WorkExperience =>
  typeof v === "string" && (WORK_EXPERIENCE_OPTIONS as readonly string[]).includes(v);
