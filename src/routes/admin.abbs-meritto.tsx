import { createFileRoute } from "@tanstack/react-router";
import AdminMerittoLogs from "@/pages/admin/AdminMerittoLogs";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/abbs-meritto")({
  head: () => ({ meta: [
    { title: "ABBS Meritto Lead Delivery | MBA Compass Admin" },
    { name: "description", content: "Push leads to ABBS through Meritto, track delivery results and run bulk uploads in MBA Compass." },
    { property: "og:title", content: "ABBS Meritto Lead Delivery | MBA Compass Admin" },
    { property: "og:description", content: "Manage ABBS Meritto lead submissions and delivery results." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: () => <AdminMerittoLogs key="abbs" client="abbs" />,
  pendingComponent: PublicPageSkeleton,
});
