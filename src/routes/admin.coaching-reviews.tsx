import { createFileRoute } from "@tanstack/react-router";
import AdminCoachingReviews from "@/pages/admin/AdminCoachingReviews";

export const Route = createFileRoute("/admin/coaching-reviews")({
  component: AdminCoachingReviews,
});
