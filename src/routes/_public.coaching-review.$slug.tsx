import { createFileRoute, notFound } from "@tanstack/react-router";
import CoachingReportPage from "@/pages/CoachingReportPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import NotFound from "@/pages/NotFound";
import { publicPageHead } from "@/lib/publicPageHead";
import { getCoachingReportFn } from "@/lib/coachingReviews.functions";

export const Route = createFileRoute("/_public/coaching-review/$slug")({
  loader: async ({ params }) => {
    const report = await getCoachingReportFn({ data: { slug: params.slug, sort: "recent", page: 1 } });
    if (!report) throw notFound();
    return report;
  },
  head: ({ loaderData, params }) =>
    publicPageHead(
      `/coaching-review/${params.slug}`,
      `${loaderData?.institute.canonical_name ?? "Coaching"} Reviews & Ratings | MBA Compass`,
      loaderData?.stats.total_reviews
        ? `${loaderData.institute.canonical_name} rated ${loaderData.stats.overall_rating}/10 by ${loaderData.stats.total_reviews} students. See detailed ratings for teaching, mocks, material, mentorship and value for money.`
        : `Read genuine student reviews and detailed ratings for ${loaderData?.institute.canonical_name ?? "this coaching institute"}.`,
    ),
  component: () => {
    const { slug } = Route.useParams();
    return <CoachingReportPage slug={slug} initialData={Route.useLoaderData()} />;
  },
  pendingComponent: PublicPageSkeleton,
  notFoundComponent: NotFound,
  errorComponent: () => <div role="alert" className="container py-12">This report could not be loaded. Please try again.</div>,
});
