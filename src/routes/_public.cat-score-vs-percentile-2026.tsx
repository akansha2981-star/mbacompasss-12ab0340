import { createFileRoute } from "@tanstack/react-router";
import CatSpokePage from "@/components/cat/CatSpokePage";
import { findCatSpoke } from "@/lib/catSpokes";
import { catSpokeHead } from "@/lib/catSpokeHead";

export const Route = createFileRoute("/_public/cat-score-vs-percentile-2026")({
  head: () => catSpokeHead("/cat-score-vs-percentile-2026"),
  component: () => <CatSpokePage spoke={findCatSpoke("/cat-score-vs-percentile-2026")} />,
});
