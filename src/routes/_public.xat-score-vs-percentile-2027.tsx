import { createFileRoute } from "@tanstack/react-router";
import XatSpokePage from "@/components/xat/XatSpokePage";
import { findXatSpoke } from "@/lib/xatSpokes";
import { xatSpokeHead } from "@/lib/xatSpokeHead";

export const Route = createFileRoute("/_public/xat-score-vs-percentile-2027")({
  head: () => xatSpokeHead("/xat-score-vs-percentile-2027"),
  component: () => <XatSpokePage spoke={findXatSpoke("/xat-score-vs-percentile-2027")} />,
});
