import { createFileRoute } from "@tanstack/react-router";
import AdminCATAlerts from "@/pages/admin/AdminCATAlerts";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/cat-alerts")({
  head: () => ({ meta: [{ title: "CAT 2026 Alerts | Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminCATAlerts />,
  pendingComponent: PublicPageSkeleton,
});
