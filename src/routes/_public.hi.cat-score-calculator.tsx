import { createFileRoute } from "@tanstack/react-router";
import CatSpokePage from "@/components/cat/CatSpokePage";
import { findCatSpoke } from "@/lib/catSpokes";
import { catSpokeHead } from "@/lib/catSpokeHead";

export const Route = createFileRoute("/_public/hi/cat-score-calculator")({
  head: () => catSpokeHead("/hi/cat-score-calculator"),
  component: () => <CatSpokePage spoke={findCatSpoke("/hi/cat-score-calculator")} />,
});
