import { useState } from "react";
import { CheckCircle2, XCircle, MinusCircle, ArrowUpRight, HelpCircle } from "lucide-react";
import type { ParsedQuestion } from "@/lib/catParser";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { analyseQuestions, questionOutcome, type QuestionOutcome } from "./questionAnalysis";

const tones: Record<QuestionOutcome, string> = {
  correct: "border-answer-correct/25 bg-answer-correct-soft text-answer-correct",
  wrong: "border-answer-wrong/25 bg-answer-wrong-soft text-answer-wrong",
  skipped: "border-answer-skipped/25 bg-answer-skipped-soft text-answer-skipped",
  unknown: "border-border bg-muted text-muted-foreground",
};
const labels: Record<QuestionOutcome, string> = { correct: "Correct", wrong: "Incorrect", skipped: "Unattempted", unknown: "Key unavailable" };
const icons = { correct: CheckCircle2, wrong: XCircle, skipped: MinusCircle, unknown: HelpCircle };
type Filter = "all" | QuestionOutcome;

function Legend() {
  return <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
    {(["correct", "wrong", "skipped"] as QuestionOutcome[]).map(outcome => {
      const Icon = icons[outcome];
      return <span key={outcome} className={`inline-flex items-center gap-1.5 ${tones[outcome].split(" ").at(-1)}`}><Icon className="h-4 w-4" />{labels[outcome]}</span>;
    })}
  </div>;
}

export function QuestionwiseSections({ questions }: { questions: ParsedQuestion[] }) {
  const sections = Array.from(new Set(questions.map(q => q.section)));
  const [filter, setFilter] = useState<Filter>("all");
  return <div className="space-y-6">
    <div className="flex flex-wrap gap-2" aria-label="Question filters">
      {(["all", "correct", "wrong", "skipped"] as Filter[]).map(f => <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === "all" ? "All questions" : labels[f]}</Button>)}
    </div>
    {sections.map(section => {
      const all = questions.filter(q => q.section === section);
      const stats = analyseQuestions(all);
      const list = all.filter(q => filter === "all" || questionOutcome(q) === filter);
      return <section key={section} className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
          <h3 className="text-xl font-semibold text-foreground">{section}</h3>
          <p className="text-sm text-muted-foreground">{stats.correct} correct · {stats.wrong} incorrect · {stats.skipped} unattempted</p>
        </div>
        {list.length === 0 ? <p className="py-3 text-sm text-muted-foreground">No questions match this filter.</p> :
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((q, i) => {
              const outcome = questionOutcome(q), Icon = icons[outcome];
              return <article key={`${q.questionNumber}-${i}`} className={`min-w-0 rounded-lg border p-4 ${tones[outcome]}`}>
                <div className="flex items-center justify-between gap-2"><h4 className="text-base font-semibold">Question {q.questionNumber}</h4><Icon className="h-4 w-4 shrink-0" /></div>
                <p className="mt-1 text-sm">{q.questionType === "SA" ? "TITA" : "MCQ"} · {labels[outcome]}</p>
                {q.questionText && <p className="mt-3 break-words text-base leading-relaxed text-foreground">{q.questionText}</p>}
                <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-current/15 pt-3 text-sm">
                  <div className="min-w-0"><dt className="text-muted-foreground">You marked</dt><dd className="mt-1 break-words font-semibold">{outcome === "skipped" ? "Not attempted" : q.chosenOption || "Not available"}</dd></div>
                  <div className="min-w-0"><dt className="text-muted-foreground">Correct answer</dt><dd className="mt-1 break-words font-semibold">{q.correctOption || "Key unavailable"}</dd></div>
                </dl>
              </article>;
            })}
          </div>}
      </section>;
    })}
  </div>;
}

export function SectionQuestionAnalysis({ questions }: { questions: ParsedQuestion[] }) {
  const [open, setOpen] = useState(false);
  const sections = Array.from(new Set(questions.map(q => q.section)));
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><Legend /><Button onClick={() => setOpen(true)} variant="outline"><ArrowUpRight className="mr-2 h-4 w-4" />Check detailed view</Button></div>
    <div className="grid gap-4 md:grid-cols-3">
      {sections.map(section => {
        const list = questions.filter(q => q.section === section);
        const stats = analyseQuestions(list);
        return <article key={section} className="min-w-0 rounded-lg border border-border bg-card p-4">
          <div className="flex items-baseline justify-between gap-2 border-b border-border pb-3"><h3 className="text-xl font-semibold text-foreground">{section}</h3><span className="text-sm text-muted-foreground">{list.length} questions</span></div>
          <div className="my-4 flex items-baseline gap-2"><span className="text-2xl font-bold tabular-nums text-primary">{stats.earnedMarks - stats.negativeMarks}</span><span className="text-sm text-muted-foreground">/ {list.length * 3} marks{stats.unknown ? " · provisional" : ""}</span></div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {[["Correct", stats.correct], ["Incorrect", stats.wrong], ["Unattempted", stats.skipped], ["Accuracy", `${stats.accuracy.toFixed(1)}%`], ["Attempt rate", `${stats.attemptRate.toFixed(1)}%`], ["Negative marks", stats.negativeMarks ? `−${stats.negativeMarks}` : "0"], ["Marks earned", `+${stats.earnedMarks}`], ["MCQ / TITA", `${stats.mcq} / ${stats.tita}`]].map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold tabular-nums text-foreground">{value}</dd></div>)}
          </dl>
          {stats.unknown > 0 && <p className="mt-3 text-sm text-muted-foreground">{stats.unknown} attempted answers awaiting an answer key.</p>}
          <div className="mt-4 border-t border-border pt-4"><p className="mb-3 text-sm font-medium text-foreground">Question-wise analysis</p><div className="grid grid-cols-6 gap-1.5">
            {list.map((q, i) => <Button key={`${q.questionNumber}-${i}`} variant="outline" className={`h-10 min-w-0 px-0 text-sm tabular-nums ${tones[questionOutcome(q)]}`} title={`Question ${q.questionNumber}: ${labels[questionOutcome(q)]}`} aria-label={`${section} question ${q.questionNumber}: ${labels[questionOutcome(q)]}`} onClick={() => setOpen(true)}>{q.questionNumber}</Button>)}
          </div></div>
        </article>;
      })}
    </div>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-5xl flex-col overflow-hidden p-4 sm:p-6">
        <DialogHeader className="shrink-0 pr-6"><DialogTitle className="text-xl">Detailed question analysis</DialogTitle><DialogDescription>VARC, DILR and QA · your marked answers against the response-sheet answer key</DialogDescription></DialogHeader>
        <div className="min-h-0 overflow-y-auto pr-1"><QuestionwiseSections questions={questions} /></div>
      </DialogContent>
    </Dialog>
  </div>;
}
