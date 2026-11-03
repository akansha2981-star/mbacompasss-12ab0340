import { publicPageHead } from "@/lib/publicPageHead";
import { findXatSpoke, XAT_HUB_PATH } from "@/lib/xatSpokes";

const SITE = "https://mbacompass.in";
const MODIFIED = "2026-11-03";

/** Route head for an XAT guide page: unique meta, canonical, FAQ + WebPage schema, hreflang for the Hindi pair. */
export function xatSpokeHead(path: string) {
  const s = findXatSpoke(path);
  const base = publicPageHead(path, s.title, s.description);
  const url = `${SITE}${path}`;
  const hreflang = path === "/hi/xat-score-calculator"
    ? [
        { rel: "alternate", hrefLang: "en-IN", href: `${SITE}${XAT_HUB_PATH}` },
        { rel: "alternate", hrefLang: "hi-IN", href: url },
        { rel: "alternate", hrefLang: "x-default", href: `${SITE}${XAT_HUB_PATH}` },
      ]
    : [];
  return {
    ...base,
    links: [...base.links, ...hreflang],
    scripts: [
      ...(base.scripts || []),
      { type: "application/ld+json", children: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "WebPage", "@id": `${url}#webpage`, url, name: s.title, description: s.description, inLanguage: s.lang === "hi" ? "hi-IN" : "en-IN", dateModified: MODIFIED, isPartOf: { "@id": `${SITE}/#website` }, breadcrumb: { "@id": `${url}#breadcrumb` } },
          { "@type": "FAQPage", "@id": `${url}#faq`, mainEntity: s.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
        ],
      }) },
    ],
  };
}
