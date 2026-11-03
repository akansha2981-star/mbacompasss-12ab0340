import { useState } from "react";
import { ChevronDown, CheckCircle2, XCircle, MinusCircle } from "lucide-react";

type Q = {
  questionNumber: number | string;
  section: string;
  questionType: string;
  status: string;
  chosenOption?: string | null;
  correctOption?: string | null;
  isCorrect?: boolean;
};

const isAnswered = (s: string) => s === "Answered" || s === "Answered & Marked for Review";

type Filter = "all" | "correct" | "wrong" | "skipped";

export function QuestionwiseSections({ questions }: { questions: Q[] }) {
  const sections = Array.from(new Set(questions.map((q) => q.section)));
  const [open, setOpen] = useState<string | null>(sections[0] ?? null);
  const [filter, setFilter] = useState<Filter>("all");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(["all", "correct", "wrong", "skipped"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-sm font-medium capitalize transition-colors ${filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}
          >
            {f}
          </button>
        ))}
      </div>
      {sections.map((sec) => {
        const all = questions.filter((q) => q.section === sec);
        const correct = all.filter((q) => isAnswered(q.status) && q.isCorrect).length;
        const wrong = all.filter((q) => isAnswered(q.status) && !q.isCorrect).length;
        const skipped = all.length - correct - wrong;
        const list = all.filter((q) => {
          const ans = isAnswered(q.status);
          if (filter === "correct") return ans && q.isCorrect;
          if (filter === "wrong") return ans && !q.isCorrect;
          if (filter === "skipped") return !ans;
          return true;
        });
        const isOpen = open === sec;
        return (
          <div key={sec} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <button
              onClick={() => setOpen(isOpen ? null : sec)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{sec}</p>
                <p className="text-sm text-muted-foreground">{all.length} questions</p>
              </div>
              <div className="flex items-center gap-2 text-sm tabular-nums">
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary"><CheckCircle2 className="h-3.5 w-3.5" />{correct}</span>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-destructive"><XCircle className="h-3.5 w-3.5" />{wrong}</span>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground"><MinusCircle className="h-3.5 w-3.5" />{skipped}</span>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </div>
            </button>
            {isOpen && (
              <div className="border-t border-border p-3 md:p-4">
                <div className="mb-3 flex gap-2 text-sm tabular-nums sm:hidden">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{correct} correct</span>
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">{wrong} wrong</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{skipped} skipped</span>
                </div>
                {list.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No questions in this filter.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {list.map((q, i) => {
                      const ans = isAnswered(q.status);
                      const tone = !ans ? "border-border bg-muted/30" : q.isCorrect ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5";
                      return (
                        <div key={i} className={`rounded-lg border p-2.5 ${tone}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">Q{q.questionNumber}</span>
                            {!ans ? <MinusCircle className="h-4 w-4 text-muted-foreground" /> : q.isCorrect ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}
                          </div>
                          <p className="text-sm text-muted-foreground">{q.questionType}</p>
                          <div className="mt-1 flex justify-between text-sm">
                            <span className="text-muted-foreground">You: <span className="font-medium text-foreground">{q.chosenOption || "—"}</span></span>
                            <span className="text-muted-foreground">Key: <span className="font-medium text-foreground">{q.correctOption || "—"}</span></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
