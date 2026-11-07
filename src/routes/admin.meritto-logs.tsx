import { createFileRoute } from "@tanstack/react-router";
import AdminMerittoLogs from "@/pages/admin/AdminMerittoLogs";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/meritto-logs")({
  head: () => ({ meta: [
    { title: "Meritto Lead Delivery | MBA Compass Admin" },
    { name: "description", content: "Manage Meritto lead submissions, delivery results and bulk uploads in MBA Compass." },
    { property: "og:title", content: "Meritto Lead Delivery | MBA Compass Admin" },
    { property: "og:description", content: "Manage Meritto lead submissions and delivery results." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: () => <AdminMerittoLogs />,
  pendingComponent: PublicPageSkeleton,
});
