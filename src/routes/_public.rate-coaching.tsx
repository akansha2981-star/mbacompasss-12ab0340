import { createFileRoute } from "@tanstack/react-router";
import RateCoachingPage from "@/pages/RateCoachingPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { publicPageHead } from "@/lib/publicPageHead";

export const Route = createFileRoute("/_public/rate-coaching")({
  head: () =>
    publicPageHead(
      "/rate-coaching",
      "Rate Your Coaching Institute | MBA Compass",
      "Share your genuine coaching experience. Rate teaching quality, mocks, study material, mentorship and more to help fellow MBA aspirants choose better.",
    ),
  component: RateCoachingPage,
  pendingComponent: PublicPageSkeleton,
});
