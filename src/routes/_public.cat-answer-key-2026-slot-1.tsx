import { createFileRoute } from "@tanstack/react-router";
import CatSpokePage from "@/components/cat/CatSpokePage";
import { findCatSpoke } from "@/lib/catSpokes";
import { catSpokeHead } from "@/lib/catSpokeHead";

export const Route = createFileRoute("/_public/cat-answer-key-2026-slot-1")({
  head: () => catSpokeHead("/cat-answer-key-2026-slot-1"),
  component: () => <CatSpokePage spoke={findCatSpoke("/cat-answer-key-2026-slot-1")} />,
});
