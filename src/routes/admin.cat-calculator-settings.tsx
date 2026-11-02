import { createFileRoute } from "@tanstack/react-router";
import AdminCATCalculatorSettings from "@/pages/admin/AdminCATCalculatorSettings";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/cat-calculator-settings")({
  head: () => ({ meta: [{ title: "CAT Calculator Settings | Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminCATCalculatorSettings />,
  pendingComponent: PublicPageSkeleton,
});
