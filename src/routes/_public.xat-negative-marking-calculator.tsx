import { createFileRoute } from "@tanstack/react-router";
import XatSpokePage from "@/components/xat/XatSpokePage";
import { findXatSpoke } from "@/lib/xatSpokes";
import { xatSpokeHead } from "@/lib/xatSpokeHead";

export const Route = createFileRoute("/_public/xat-negative-marking-calculator")({
  head: () => xatSpokeHead("/xat-negative-marking-calculator"),
  component: () => <XatSpokePage spoke={findXatSpoke("/xat-negative-marking-calculator")} />,
});
