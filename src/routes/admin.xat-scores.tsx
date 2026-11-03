import { createFileRoute } from "@tanstack/react-router";
import AdminXATScores from "@/pages/admin/AdminXATScores";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/xat-scores")({
  head: () => ({ meta: [{ title: "XAT Scores | Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminXATScores />,
  pendingComponent: PublicPageSkeleton,
});
