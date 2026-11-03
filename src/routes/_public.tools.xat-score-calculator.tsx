import { createFileRoute } from "@tanstack/react-router";
import { publicPageHead } from "@/lib/publicPageHead";
import XATScoreCalculatorPage from "@/pages/XATScoreCalculatorPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { XAT_HUB_FAQS } from "@/lib/xatHubContent";

const URL = "https://mbacompass.in/tools/xat-score-calculator";
const TITLE = "XAT Score Calculator 2027: Score, Percentile & XLRI Calls";
const DESC = "Paste your XAT 2027 response sheet link. Get VALR, DM, QA&DI and GK scores with the unattempted penalty, an estimated percentile and XLRI cut-off comparison. Free.";

export const Route = createFileRoute("/_public/tools/xat-score-calculator")({
  component: () => <XATScoreCalculatorPage />,
  pendingComponent: PublicPageSkeleton,
  head: () => {
    const base = publicPageHead("/tools/xat-score-calculator", TITLE, DESC);
    return {
      ...base,
      links: [...base.links,
        { rel: "alternate", hrefLang: "en-IN", href: URL },
        { rel: "alternate", hrefLang: "hi-IN", href: "https://mbacompass.in/hi/xat-score-calculator" },
        { rel: "alternate", hrefLang: "x-default", href: URL }],
      scripts: [...base.scripts, { type: "application/ld+json", children: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "WebPage", "@id": `${URL}#webpage`, url: URL, name: TITLE, description: DESC, inLanguage: "en-IN", dateModified: "2026-11-03",
            isPartOf: { "@id": "https://mbacompass.in/#website" }, breadcrumb: { "@id": `${URL}#breadcrumb` }, mainEntity: { "@id": `${URL}#app` } },
          { "@type": "WebApplication", "@id": `${URL}#app`, name: "XAT Score Calculator", url: URL, description: DESC, applicationCategory: "EducationalApplication",
            operatingSystem: "Web", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "INR" }, publisher: { "@id": "https://mbacompass.in/#organization" } },
          { "@type": "HowTo", name: "How to calculate your XAT score", totalTime: "PT2M", step: [
            { "@type": "HowToStep", position: 1, name: "Open your response sheet", text: "Log in to xatonline.in and open your XAT response sheet." },
            { "@type": "HowToStep", position: 2, name: "Copy the link", text: "Copy the digialm.com page address, or the page source if the link has expired." },
            { "@type": "HowToStep", position: 3, name: "Apply XAT marking", text: "+1 per correct answer, −0.25 per wrong answer, and −0.10 per unattempted Part 1 question after the first 8." },
            { "@type": "HowToStep", position: 4, name: "Compare with percentile bands", text: "Read your Part 1 score against the XAT score vs percentile table." } ] },
          { "@type": "DefinedTermSet", name: "XAT scoring terms", hasDefinedTerm: [
            { "@type": "DefinedTerm", name: "Part 1", description: "VALR, Decision Making and QA&DI; the only part used for XAT percentile." },
            { "@type": "DefinedTerm", name: "Unattempted penalty", description: "−0.10 for each unattempted Part 1 question after the first 8." },
            { "@type": "DefinedTerm", name: "Decision Making", description: "XAT section of business and ethical caselets testing judgement." } ] },
          { "@type": "FAQPage", mainEntity: XAT_HUB_FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
        ],
      }) }],
    };
  },
});
