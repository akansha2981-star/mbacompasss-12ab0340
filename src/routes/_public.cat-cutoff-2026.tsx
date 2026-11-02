import { createFileRoute } from "@tanstack/react-router";
import CatSpokePage from "@/components/cat/CatSpokePage";
import { findCatSpoke } from "@/lib/catSpokes";
import { catSpokeHead } from "@/lib/catSpokeHead";

export const Route = createFileRoute("/_public/cat-cutoff-2026")({
  head: () => catSpokeHead("/cat-cutoff-2026"),
  component: () => <CatSpokePage spoke={findCatSpoke("/cat-cutoff-2026")} />,
});
