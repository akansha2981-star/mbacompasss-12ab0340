import { createFileRoute } from "@tanstack/react-router";
import CatSpokePage from "@/components/cat/CatSpokePage";
import { findCatSpoke } from "@/lib/catSpokes";
import { catSpokeHead } from "@/lib/catSpokeHead";

export const Route = createFileRoute("/_public/cat-normalization-explained")({
  head: () => catSpokeHead("/cat-normalization-explained"),
  component: () => <CatSpokePage spoke={findCatSpoke("/cat-normalization-explained")} />,
});
