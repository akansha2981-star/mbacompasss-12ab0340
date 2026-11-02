import { createFileRoute } from "@tanstack/react-router";
import CatSpokePage from "@/components/cat/CatSpokePage";
import { findCatSpoke } from "@/lib/catSpokes";
import { catSpokeHead } from "@/lib/catSpokeHead";

export const Route = createFileRoute("/_public/cat-composite-score-calculator")({
  head: () => catSpokeHead("/cat-composite-score-calculator"),
  component: () => <CatSpokePage spoke={findCatSpoke("/cat-composite-score-calculator")} />,
});
