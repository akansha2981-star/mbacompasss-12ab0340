import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXAM_CATEGORIES, RATING_PARAMETERS } from "@/lib/coachingReviews";
import { getCoachingReportFn } from "@/lib/coachingReviews.functions";

type ReportData = NonNullable<Awaited<ReturnType<typeof getCoachingReportFn>>>;

const DISTRIBUTION_BUCKETS = ["1-2", "3-4", "5-6", "7-8", "9-10"] as const;

export default function CoachingReportPage({ slug, initialData }: { slug: string; initialData: ReportData }) {
  const reportFn = useServerFn(getCoachingReportFn);
  const [sort, setSort] = useState<"recent" | "highest" | "lowest">("recent");
  const [exam, setExam] = useState<string>("");
  const [page, setPage] = useState(1);

  const { data } = useQuery({
    queryKey: ["coaching-report", slug, sort, exam, page],
    queryFn: () => reportFn({ data: { slug, sort, exam: exam || null, page } }),
    initialData: sort === "recent" && !exam && page === 1 ? initialData : undefined,
    placeholderData: (prev) => prev,
  });

  const report = (data ?? initialData) as ReportData;
  const { institute, stats, reviews, totalMatching, pageSize } = report;
  const totalPages = Math.max(1, Math.ceil(totalMatching / pageSize));
  const maxBucket = Math.max(1, ...DISTRIBUTION_BUCKETS.map((b) => stats.distribution?.[b] ?? 0));

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border bg-accent/40">
        <div className="container max-w-4xl py-10">
          {demo && <p role="status" className="mb-4 border-l-4 border-primary bg-accent p-4 text-base font-semibold text-foreground">DEMO DATA — Fictional comments and ratings for layout testing only. Not real student feedback or institute reputation.</p>}
          <h1 className="text-3xl font-bold text-foreground">{institute.canonical_name}</h1>
          <p className="mt-1 text-base text-muted-foreground">Student ratings and reviews</p>
          <div className="mt-6 flex flex-wrap items-end gap-6">
            <div>
              <p className="flex items-center gap-2 text-3xl font-bold text-foreground">
                <Star className="h-7 w-7 fill-amber-400 text-amber-400" />
                {stats.overall_rating !== null ? `${stats.overall_rating} / 10` : "Not rated yet"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
            Based on {stats.total_reviews} approved student review{stats.total_reviews === 1 ? "" : "s"}
              </p>
            </div>
            {stats.last_review_at && (
              <p className="text-sm text-muted-foreground">
                Last review: {new Date(stats.last_review_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            )}
          </div>
          {institute.description && <p className="mt-4 text-base text-muted-foreground">{institute.description}</p>}
        </div>
      </section>

      <div className="container max-w-4xl space-y-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Detailed rating breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {RATING_PARAMETERS.map((param) => {
              const value = stats.parameters?.[param.key];
              return (
                <div key={param.key} className="grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-[220px_1fr_auto]">
                  <p className="text-base text-foreground">{param.label}</p>
                  <Progress value={value ? value * 10 : 0} className="hidden h-2 sm:block" />
                  <p className="text-base font-semibold text-foreground">{value !== null && value !== undefined ? `${value}/10` : "—"}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Rating distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {DISTRIBUTION_BUCKETS.map((bucket) => {
              const count = stats.distribution?.[bucket] ?? 0;
              return (
                <div key={bucket} className="grid grid-cols-[48px_1fr_40px] items-center gap-3">
                  <p className="text-sm text-muted-foreground">{bucket}</p>
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(count / maxBucket) * 100}%` }} />
                  </div>
                  <p className="text-right text-sm text-foreground">{count}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-foreground">Student reviews</h2>
            <div className="flex flex-wrap gap-2">
              <Select
                value={sort}
                onValueChange={(v) => {
                  setSort(v as typeof sort);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="highest">Highest Rated</SelectItem>
                  <SelectItem value="lowest">Lowest Rated</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={exam || "all"}
                onValueChange={(v) => {
                  setExam(v === "all" ? "" : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exams</SelectItem>
                  {EXAM_CATEGORIES.filter((e) => e !== "Other").map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {reviews.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-base text-muted-foreground">No approved reviews yet. Be the first to share your experience.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="space-y-3 py-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-base font-semibold text-foreground">{review.student_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {[review.exam_category, review.preparation_year, review.class_mode].filter(Boolean).join(" · ")}
                          {review.created_at &&
                            ` · ${new Date(review.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                        </p>
                      </div>
                      <p className="flex items-center gap-1.5 text-base font-bold text-foreground">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        {Number(review.average_rating).toFixed(1)} / 10
                      </p>
                    </div>
                    <p className="text-base text-foreground">{review.review_comment}</p>
                    <details className="text-sm">
                      <summary className="cursor-pointer text-primary">View parameter ratings</summary>
                      <div className="mt-2 grid gap-1 sm:grid-cols-2">
                        {RATING_PARAMETERS.map((param) => (
                          <p key={param.key} className="text-sm text-muted-foreground">
                            {param.label}: <span className="font-medium text-foreground">{(review as any)[param.key]}/10</span>
                          </p>
                        ))}
                      </div>
                    </details>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
