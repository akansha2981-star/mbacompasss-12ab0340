import { createFileRoute } from "@tanstack/react-router";
import XatSpokePage from "@/components/xat/XatSpokePage";
import { findXatSpoke } from "@/lib/xatSpokes";
import { xatSpokeHead } from "@/lib/xatSpokeHead";

export const Route = createFileRoute("/_public/xat-marking-scheme")({
  head: () => xatSpokeHead("/xat-marking-scheme"),
  component: () => <XatSpokePage spoke={findXatSpoke("/xat-marking-scheme")} />,
});
