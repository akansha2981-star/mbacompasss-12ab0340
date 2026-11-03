import { createFileRoute } from "@tanstack/react-router";
import XatSpokePage from "@/components/xat/XatSpokePage";
import { findXatSpoke } from "@/lib/xatSpokes";
import { xatSpokeHead } from "@/lib/xatSpokeHead";

export const Route = createFileRoute("/_public/hi/xat-score-calculator")({
  head: () => xatSpokeHead("/hi/xat-score-calculator"),
  component: () => <XatSpokePage spoke={findXatSpoke("/hi/xat-score-calculator")} />,
});
