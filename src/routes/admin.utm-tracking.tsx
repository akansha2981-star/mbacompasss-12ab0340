import { createFileRoute } from "@tanstack/react-router";
import AdminUtmTracking from "@/pages/admin/AdminUtmTracking";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/utm-tracking")({
  head: () => ({ meta: [{ title: "UTM Tracking | Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminUtmTracking />,
  pendingComponent: PublicPageSkeleton,
});
