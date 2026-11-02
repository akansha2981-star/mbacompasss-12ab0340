import { computeAverageRating, RATING_PARAMETERS, type RatingsMap } from "./coachingReviews";
import type { getCoachingReportFn } from "./coachingReviews.functions";

export type CoachingReportData = NonNullable<Awaited<ReturnType<typeof getCoachingReportFn>>>;

// Synthetic fixtures only: never inserted into review tables or public reputation stats.
export const DEMO_INSTITUTES = [
  { slug: "catking", name: "CATKING", count: 70, negativePercent: 70 },
  { slug: "time", name: "TIME", count: 81, negativePercent: 27 },
  { slug: "iquanta", name: "iQuanta", count: 65, negativePercent: 63 },
  { slug: "ims", name: "IMS", count: 94, negativePercent: 17 },
  { slug: "mindworks", name: "Mindworks", count: 46, negativePercent: 87 },
  { slug: "cracku", name: "Cracku", count: 98, negativePercent: 54 },
] as const;

const positiveComments = [
  "The sample student found the concept explanations clear and the practice schedule manageable.",
  "The sample student liked the mock analysis and felt the revision material supported regular practice.",
  "The sample student appreciated the structured sessions and the guidance on preparation priorities.",
  "The sample student found the recorded lessons useful for revisiting difficult topics at their own pace.",
  "The sample student felt the doubt discussions and feedback helped them identify areas for improvement.",
];
const negativeComments = [
  "The sample student wanted more individual feedback and a clearer plan for addressing weak areas.",
  "The sample student felt the pace of lessons was difficult to follow and wanted more worked examples.",
  "The sample student expected quicker doubt resolution and more consistent preparation guidance.",
  "The sample student wanted better organisation of revision material and more detailed mock explanations.",
  "The sample student felt the experience did not meet their expectations and wanted more personal support.",
];

export function getDemoCoachingReport(slug: string, sort = "recent", exam = "", page = 1): CoachingReportData {
  const config = DEMO_INSTITUTES.find((item) => item.slug === slug) ?? DEMO_INSTITUTES[0];
  const negativeCount = Math.round(config.count * config.negativePercent / 100);
  const allReviews = Array.from({ length: config.count }, (_, index) => {
    // Spread positive and negative examples through the chronological list.
    const negative = Math.floor((index + 1) * negativeCount / config.count) > Math.floor(index * negativeCount / config.count);
    const ratings = Object.fromEntries(RATING_PARAMETERS.map((param, p) => [param.key,
      negative ? 2 + (index + p) % 3 : 7 + (index + p) % 4,
    ])) as RatingsMap;
    const comments = negative ? negativeComments : positiveComments;
    return {
      ...ratings,
      id: `demo-${config.slug}-${index + 1}`,
      institute_id: `demo-${config.slug}`,
      student_name: `Demo student ${String(index + 1).padStart(2, "0")}`,
      exam_category: index % 4 === 0 ? "XAT" : "CAT",
      preparation_year: "2026",
      class_mode: ["Online", "Offline", "Hybrid"][index % 3],
      created_at: new Date(Date.UTC(2026, 10, 2) - index * 86400000).toISOString(),
      average_rating: computeAverageRating(ratings),
      review_comment: `DEMO — fictional feedback, not a real student review. ${comments[index % comments.length]} Sample scenario ${index + 1}.`,
    };
  });
  const parameters = Object.fromEntries(RATING_PARAMETERS.map(({ key }) => [key,
    Math.round(allReviews.reduce((sum, review) => sum + review[key], 0) / config.count * 10) / 10,
  ]));
  const distribution: Record<string, number> = { "1-2": 0, "3-4": 0, "5-6": 0, "7-8": 0, "9-10": 0 };
  for (const review of allReviews) {
    const value = review.average_rating;
    const bucket = value <= 2 ? "1-2" : value <= 4 ? "3-4" : value <= 6 ? "5-6" : value <= 8 ? "7-8" : "9-10";
    distribution[bucket] += 1;
  }
  const filtered = allReviews.filter((review) => !exam || review.exam_category === exam);
  if (sort === "highest") filtered.sort((a, b) => b.average_rating - a.average_rating);
  if (sort === "lowest") filtered.sort((a, b) => a.average_rating - b.average_rating);
  return {
    institute: { id: `demo-${config.slug}`, slug: config.slug, canonical_name: config.name,
      description: null, created_at: allReviews[0]?.created_at ?? "2026-11-02T00:00:00.000Z" },
    stats: { total_reviews: config.count,
      overall_rating: Math.round(allReviews.reduce((sum, r) => sum + r.average_rating, 0) / config.count * 10) / 10,
      last_review_at: allReviews[0]?.created_at ?? null, parameters, distribution },
    reviews: filtered.slice((page - 1) * 10, page * 10),
    totalMatching: filtered.length, page, pageSize: 10,
  };
}