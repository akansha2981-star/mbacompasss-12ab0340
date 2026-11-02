import { createFileRoute } from "@tanstack/react-router";
import CatSpokePage from "@/components/cat/CatSpokePage";
import { findCatSpoke } from "@/lib/catSpokes";
import { catSpokeHead } from "@/lib/catSpokeHead";

export const Route = createFileRoute("/_public/cat-percentile-predictor")({
  head: () => catSpokeHead("/cat-percentile-predictor"),
  component: () => <CatSpokePage spoke={findCatSpoke("/cat-percentile-predictor")} />,
});
