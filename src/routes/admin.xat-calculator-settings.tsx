import { createFileRoute } from "@tanstack/react-router";
import AdminXATCalculatorSettings from "@/pages/admin/AdminXATCalculatorSettings";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/admin/xat-calculator-settings")({
  head: () => ({ meta: [{ title: "XAT Calculator Settings | Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminXATCalculatorSettings />,
  pendingComponent: PublicPageSkeleton,
});
