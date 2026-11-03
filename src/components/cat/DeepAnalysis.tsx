import type { ParsedQuestion } from "@/lib/catParser";
import { analyseQuestions, questionOutcome } from "./questionAnalysis";

const dot: Record<string, string> = {
  correct: "bg-answer-correct",
  wrong: "bg-answer-wrong",
  skipped: "bg-answer-skipped",
  unknown: "bg-muted-foreground",
};

const net = (qs: ParsedQuestion[]) => { const s = analyseQuestions(qs); return s.earnedMarks - s.negativeMarks; };
const pct = (v: number) => `${v.toFixed(1)}%`;

function Card({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return <article className="min-w-0 rounded-lg border border-border bg-card p-4 md:p-5">
    <h3 className="text-xl font-semibold text-foreground">{title}</h3>
    <p className="mb-4 text-sm text-muted-foreground">{sub}</p>
    {children}
  </article>;
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="min-w-0"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 text-base font-semibold tabular-nums text-foreground">{value}</dd></div>;
}

/** Set-wise, question-type, review-flag and lost-marks analysis derived only from the response sheet. */
export function DeepAnalysis({ questions }: { questions: ParsedQuestion[] }) {
  const sections = Array.from(new Set(questions.map(q => q.section)));

  const byType = (["MCQ", "SA"] as const).map(t => ({ t, qs: questions.filter(q => q.questionType === t) })).filter(x => x.qs.length);
  const marked = questions.filter(q => q.markedForReview);
  const markedAnswered = marked.filter(q => q.status.startsWith("Answered"));
  const ms = analyseQuestions(markedAnswered);
  const all = analyseQuestions(questions);
  const wrongMcq = all.negativeMarks;
  const wrongTita = questions.filter(q => q.questionType === "SA" && questionOutcome(q) === "wrong").length;

  return <div className="space-y-4">
    <Card title="Set-wise performance" sub="How you did on each reading passage and DILR/QA set, in the order they appeared">
      <div className="space-y-5">
        {sections.map(section => {
          const qs = questions.filter(q => q.section === section);
          const keys = Array.from(new Set(qs.filter(q => q.setKey).map(q => q.setKey!)));
          const groups = keys.map((k, i) => ({ label: `${section === "VARC" ? "Passage" : "Set"} ${i + 1}`, qs: qs.filter(q => q.setKey === k) }));
          const solo = qs.filter(q => !q.setKey);
          if (solo.length) groups.push({ label: section === "VARC" ? "Verbal ability" : "Standalone", qs: solo });
          return <div key={section}>
            <p className="mb-2 text-base font-semibold text-foreground">{section}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {groups.map(g => {
                const s = analyseQuestions(g.qs);
                const first = g.qs[0]?.questionNumber, last = g.qs[g.qs.length - 1]?.questionNumber;
                return <div key={g.label} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{g.label} <span className="text-muted-foreground">· Q{first}{last !== first ? `–${last}` : ""}</span></p>
                    <div className="mt-2 flex flex-wrap gap-1">{g.qs.map((q, i) => <span key={i} title={`Q${q.questionNumber}`} className={`h-2.5 w-2.5 rounded-full ${dot[questionOutcome(q)]}`} />)}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{s.correct} correct · {s.wrong} wrong · {s.skipped} skipped</p>
                  </div>
                  <span className="shrink-0 text-xl font-bold tabular-nums text-primary">{net(g.qs) > 0 ? "+" : ""}{net(g.qs)}</span>
                </div>;
              })}
            </div>
          </div>;
        })}
      </div>
    </Card>

    <div className="grid gap-4 md:grid-cols-3">
      <Card title="MCQ vs TITA" sub="TITA has no negative marking">
        <div className="space-y-4">
          {byType.map(({ t, qs }) => { const s = analyseQuestions(qs); return <div key={t}>
            <p className="mb-2 text-sm font-medium text-foreground">{t === "SA" ? "TITA" : "MCQ"} · {qs.length} questions</p>
            <dl className="grid grid-cols-3 gap-2"><Stat label="Attempted" value={s.attempted} /><Stat label="Accuracy" value={pct(s.accuracy)} /><Stat label="Net marks" value={net(qs)} /></dl>
          </div>; })}
        </div>
      </Card>

      <Card title="Marked for review" sub="Answers flagged for review are still evaluated">
        <dl className="grid grid-cols-2 gap-3">
          <Stat label="Flagged" value={marked.length} />
          <Stat label="Flagged, no answer" value={marked.length - markedAnswered.length} />
          <Stat label="Flagged & answered" value={markedAnswered.length} />
          <Stat label="Their accuracy" value={markedAnswered.length ? pct(ms.accuracy) : "—"} />
        </dl>
      </Card>

      <Card title="Marks left on the table" sub="Where your score leaked">
        <dl className="grid grid-cols-2 gap-3">
          <Stat label="Negative marks" value={wrongMcq ? `−${wrongMcq}` : "0"} />
          <Stat label="Wrong MCQ / TITA" value={`${wrongMcq} / ${wrongTita}`} />
          <Stat label="Lost on wrong attempts" value={(all.wrong * 3) + wrongMcq} />
          <Stat label="Unattempted marks" value={all.skipped * 3} />
        </dl>
      </Card>
    </div>
  </div>;
}
