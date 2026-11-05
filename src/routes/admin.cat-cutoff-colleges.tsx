import { createFileRoute } from "@tanstack/react-router";
import AdminCATCutoffColleges from "@/pages/admin/AdminCATCutoffColleges";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/cat-cutoff-colleges")({
  head: () => ({ meta: [{ title: "CAT Cut-off Colleges | Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminCATCutoffColleges />,
  pendingComponent: PublicPageSkeleton,
});
