import { createFileRoute } from "@tanstack/react-router";
import XatSpokePage from "@/components/xat/XatSpokePage";
import { findXatSpoke } from "@/lib/xatSpokes";
import { xatSpokeHead } from "@/lib/xatSpokeHead";

export const Route = createFileRoute("/_public/xlri-call-predictor")({
  head: () => xatSpokeHead("/xlri-call-predictor"),
  component: () => <XatSpokePage spoke={findXatSpoke("/xlri-call-predictor")} />,
});
