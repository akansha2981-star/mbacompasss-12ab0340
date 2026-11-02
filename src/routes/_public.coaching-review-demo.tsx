import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import CoachingReportPage from "@/pages/CoachingReportPage";
import { DEMO_INSTITUTES, getDemoCoachingReport } from "@/lib/coachingReviewDemo";
import { privatePageHead } from "@/lib/publicPageHead";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_public/coaching-review-demo")({
  head: () => privatePageHead("/coaching-review-demo", "Demo Coaching Reports | MBA Compass", "Fictional coaching review samples for report layout testing. Not real student feedback."),
  component: DemoReports,
});

function DemoReports() {
  const [slug, setSlug] = useState("catking");
  const selected = DEMO_INSTITUTES.find((item) => item.slug === slug) ?? DEMO_INSTITUTES[0];
  return <>
    <section className="container max-w-4xl space-y-3 py-6">
      <h2 className="text-xl font-semibold text-foreground">Demo report preview</h2>
      <Select value={slug} onValueChange={setSlug}>
        <SelectTrigger aria-label="Demo institute" className="w-full sm:w-72"><SelectValue /></SelectTrigger>
        <SelectContent>{DEMO_INSTITUTES.map((item) => <SelectItem key={item.slug} value={item.slug}>{item.name} — {item.count} demo comments</SelectItem>)}</SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">Target mix: {selected.negativePercent}% negative / {100 - selected.negativePercent}% positive. Whole-comment counts are rounded to the nearest comment. IMS is set to 83% positive.</p>
    </section>
    <CoachingReportPage key={slug} slug={slug} initialData={getDemoCoachingReport(slug)} demo />
  </>;
}