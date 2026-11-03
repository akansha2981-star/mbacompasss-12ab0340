import { ArrowRight, Calculator } from "lucide-react";
import type { XatSpoke } from "@/lib/xatSpokes";
import { XAT_HUB_PATH } from "@/lib/xatSpokes";
import XatManualCalculator from "./XatManualCalculator";
import CatAlertSignup from "@/components/cat/CatAlertSignup";
import { XatPercentileTable, XatCutoffTable, XatAnswerKeyStatus, XatRelatedLinks, XatStatusBanner, XatPatternTable } from "./XatWidgets";

export default function XatSpokePage({ spoke }: { spoke: XatSpoke }) {
  const hi = spoke.lang === "hi";
  return (
    <div className="cat-score-pattern min-h-screen" lang={hi ? "hi" : "en"}>
      <article className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:py-10">
        <XatStatusBanner />
        <header>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-sm font-semibold text-destructive">XAT 2027 · XLRI Jamshedpur</span>
          <h1 className="mt-3 text-2xl font-bold leading-tight text-foreground md:text-4xl">{spoke.h1}</h1>
          <p className="mt-3 text-base text-muted-foreground">{spoke.intro}</p>
          <a href={XAT_HUB_PATH} className="cat-cta mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-base font-bold text-primary-foreground">
            <Calculator className="h-5 w-5" />
            {hi ? "अपना XAT 2027 Score निकालें" : "Calculate Your XAT 2027 Score"} <ArrowRight className="cat-cta-arrow h-5 w-5" />
          </a>
        </header>

        {spoke.keyFacts && (
          <aside className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">{hi ? "मुख्य बातें" : "Key facts"}</p>
            <ul className="mt-2 space-y-1.5 text-base text-foreground">
              {spoke.keyFacts.map((f) => <li key={f} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{f}</li>)}
            </ul>
          </aside>
        )}

        <nav aria-label={hi ? "इस पेज पर" : "On this page"} className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">{hi ? "इस पेज पर" : "On this page"}</p>
          <ol className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {spoke.sections.map((s, i) => <li key={s.heading}><a href={`#s-${i}`} className="text-primary hover:underline">{s.heading}</a></li>)}
            <li><a href="#faqs" className="text-primary hover:underline">{hi ? "अक्सर पूछे जाने वाले सवाल" : "FAQs"}</a></li>
          </ol>
        </nav>

        {spoke.widget === "manual" && <section className="rounded-xl border border-border bg-card p-4 shadow-sm"><XatManualCalculator /></section>}
        {spoke.widget === "percentileTable" && <XatPercentileTable />}
        {spoke.widget === "cutoffs" && <XatCutoffTable />}
        {spoke.widget === "answerKey" && <XatAnswerKeyStatus />}
        {spoke.widget === "pattern" && <XatPatternTable />}

        {spoke.sections.map((s, i) => (
          <section key={s.heading} id={`s-${i}`} className="scroll-mt-24">
            <h2 className="text-xl font-bold text-foreground">{s.heading}</h2>
            {s.body.map((p) => <p key={p.slice(0, 40)} className="mt-2 text-base text-muted-foreground">{p}</p>)}
            {s.list && <ol className="mt-2 list-decimal space-y-1 pl-5 text-base text-muted-foreground">{s.list.map((l) => <li key={l}>{l}</li>)}</ol>}
            {s.table && (
              <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
                <table className="cat-table w-full">
                  <thead><tr>{s.table.head.map((h) => <th key={h} className="text-left">{h}</th>)}</tr></thead>
                  <tbody>{s.table.rows.map((r) => <tr key={r.join("|")}>{r.map((c, j) => <td key={j} className={j === 0 ? "font-semibold" : ""}>{c}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}
          </section>
        ))}

        {spoke.widget !== "pattern" && <section><h2 className="mb-2 text-xl font-bold text-foreground">{hi ? "XAT परीक्षा पैटर्न" : "XAT exam pattern and marking"}</h2><XatPatternTable /></section>}

        <section id="faqs" className="scroll-mt-24">
          <h2 className="mb-2 text-xl font-bold text-foreground">{hi ? "अक्सर पूछे जाने वाले सवाल" : "Frequently asked questions"}</h2>
          <div className="space-y-2">
            {spoke.faqs.map((f) => (
              <details key={f.q} className="rounded-xl border border-border bg-card px-4 py-3">
                <summary className="cursor-pointer text-base font-semibold text-foreground">{f.q}</summary>
                <p className="mt-2 text-base text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <CatAlertSignup exam="XAT 2027" />
        <section><h2 className="mb-2 text-xl font-bold text-foreground">{hi ? "और XAT tools" : "More XAT 2027 tools"}</h2><XatRelatedLinks exclude={spoke.path} /></section>
      </article>
    </div>
  );
}
