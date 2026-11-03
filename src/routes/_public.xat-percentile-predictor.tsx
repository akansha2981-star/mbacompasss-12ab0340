import { createFileRoute } from "@tanstack/react-router";
import XatSpokePage from "@/components/xat/XatSpokePage";
import { findXatSpoke } from "@/lib/xatSpokes";
import { xatSpokeHead } from "@/lib/xatSpokeHead";

export const Route = createFileRoute("/_public/xat-percentile-predictor")({
  head: () => xatSpokeHead("/xat-percentile-predictor"),
  component: () => <XatSpokePage spoke={findXatSpoke("/xat-percentile-predictor")} />,
});
