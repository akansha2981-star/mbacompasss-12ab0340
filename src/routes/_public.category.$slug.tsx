import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute, notFound } from "@tanstack/react-router";
import CategoryPage from "@/pages/CategoryPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import NotFound from "@/pages/NotFound";
import { categoriesQuery, institutesQuery } from "@/lib/queries/listingQueries";

export const Route = createFileRoute("/_public/category/$slug")({
  // Only real category records get a page; unknown slugs are a real 404
  // instead of silently listing every institute.
  loader: async ({ params, context }) => {
    const [categories] = await Promise.all([
      context.queryClient.ensureQueryData(categoriesQuery),
      context.queryClient.ensureQueryData(institutesQuery()),
    ]);
    const category = categories.find((c: any) => c.slug === params.slug);
    if (!category) throw notFound();
    return { name: String(category.name || params.slug) };
  },
  head: ({ params, loaderData }) => {
    const name = loaderData?.name?.replace(/\s+coaching\s*$/i, "").trim();
    return name
      ? publicPageHead(`/category/${params.slug}`, `${name} Coaching Institutes & Fees | MBA Compass`, `Compare ${name} coaching institutes by city, fee range and student rating on MBA Compass.`)
      : publicPageHead(`/category/${params.slug}`, "Coaching Category Unavailable | MBA Compass", "This coaching category is not available on MBA Compass.");
  },
  component: () => <CategoryPage />,
  pendingComponent: PublicPageSkeleton,
  notFoundComponent: NotFound,
  errorComponent: () => <div role="alert" className="container py-12">Coaching listings could not be loaded. Please try again.</div>,
});
