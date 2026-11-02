import { createFileRoute } from "@tanstack/react-router";
import CatSpokePage from "@/components/cat/CatSpokePage";
import { findCatSpoke } from "@/lib/catSpokes";
import { catSpokeHead } from "@/lib/catSpokeHead";

export const Route = createFileRoute("/_public/iim-call-predictor")({
  head: () => catSpokeHead("/iim-call-predictor"),
  component: () => <CatSpokePage spoke={findCatSpoke("/iim-call-predictor")} />,
});
