import { useState } from "react";
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";

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
  const [filter, setFilter] = useState<Filter>("all");

  return (
    <div className="space-y-6">
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
        return (
          <div key={sec} className="rounded-xl border border-border bg-card p-3 shadow-sm md:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <p className="font-semibold text-foreground">{sec}</p>
                <p className="text-sm text-muted-foreground">{all.length} questions</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm tabular-nums">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary"><CheckCircle2 className="h-3.5 w-3.5" />{correct} correct</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-destructive"><XCircle className="h-3.5 w-3.5" />{wrong} wrong</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground"><MinusCircle className="h-3.5 w-3.5" />{skipped} skipped</span>
              </div>
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
        );
      })}
    </div>
  );
}
