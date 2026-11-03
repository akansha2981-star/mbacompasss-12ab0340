import type { ParsedQuestion } from "@/lib/catParser";
import { analyseQuestions, questionOutcome, CAT_SCHEME, type MarkingScheme } from "./questionAnalysis";

const dot: Record<string, string> = {
  correct: "bg-answer-correct",
  wrong: "bg-answer-wrong",
  skipped: "bg-answer-skipped",
  unknown: "bg-muted-foreground",
};

let SCHEME: MarkingScheme = CAT_SCHEME;
const net = (qs: ParsedQuestion[]) => { const s = analyseQuestions(qs, SCHEME); return Math.round((s.earnedMarks - s.negativeMarks) * 100) / 100; };
const isPassageSection = (s: string) => s === "VARC" || s === "VALR";
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
export function DeepAnalysis({ questions, scheme = CAT_SCHEME }: { questions: ParsedQuestion[]; scheme?: MarkingScheme }) {
  SCHEME = scheme;
  const sections = Array.from(new Set(questions.map(q => q.section)));

  const byType = (["MCQ", "SA"] as const).map(t => ({ t, qs: questions.filter(q => q.questionType === t) })).filter(x => x.qs.length);
  const marked = questions.filter(q => q.markedForReview);
  const markedAnswered = marked.filter(q => q.status.startsWith("Answered"));
  const ms = analyseQuestions(markedAnswered, scheme);
  const all = analyseQuestions(questions, scheme);
  const wrongMcq = all.wrongMcqCount;
  const hasTita = byType.some(x => x.t === "SA");
  const wrongTita = questions.filter(q => q.questionType === "SA" && questionOutcome(q) === "wrong").length;

  return <div className="space-y-4">
    <Card title="Set-wise performance" sub="How you did on each reading passage and DILR/QA set, in the order they appeared">
      <div className="space-y-5">
        {sections.map(section => {
          const qs = questions.filter(q => q.section === section);
          const keys = Array.from(new Set(qs.filter(q => q.setKey).map(q => q.setKey!)));
          const groups = keys.map((k, i) => ({ label: `${isPassageSection(section) ? "Passage" : "Set"} ${i + 1}`, qs: qs.filter(q => q.setKey === k) }));
          const solo = qs.filter(q => !q.setKey);
          if (solo.length) groups.push({ label: isPassageSection(section) ? "Verbal ability" : "Standalone", qs: solo });
          return <div key={section}>
            <p className="mb-2 text-base font-semibold text-foreground">{section}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {groups.map(g => {
                const s = analyseQuestions(g.qs, scheme);
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
      <Card title={hasTita ? "MCQ vs TITA" : "Question type"} sub={hasTita ? "TITA has no negative marking" : `Every question is an MCQ: +${scheme.correct} right, −${scheme.wrongMcq} wrong`}>
        <div className="space-y-4">
          {byType.map(({ t, qs }) => { const s = analyseQuestions(qs, scheme); return <div key={t}>
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
          <Stat label="Negative marks" value={all.negativeMarks ? `−${all.negativeMarks}` : "0"} />
          <Stat label={hasTita ? "Wrong MCQ / TITA" : "Wrong answers"} value={hasTita ? `${wrongMcq} / ${wrongTita}` : wrongMcq} />
          <Stat label="Lost on wrong attempts" value={Math.round((all.wrong * scheme.correct + all.negativeMarks) * 100) / 100} />
          <Stat label="Unattempted marks" value={all.skipped * scheme.correct} />
        </dl>
      </Card>
    </div>

    <MoreStats questions={questions} sections={sections} />
  </div>;
}

function longestRun(qs: ParsedQuestion[], o: string) {
  let best = 0, cur = 0;
  for (const q of qs) { cur = questionOutcome(q) === o ? cur + 1 : 0; best = Math.max(best, cur); }
  return best;
}

/** Further stats read straight from the sheet: attempt status, pacing within each section, answer-option habits, streaks and best/weakest sets. */
function MoreStats({ questions, sections }: { questions: ParsedQuestion[]; sections: string[] }) {
  const answeredOnly = questions.filter(q => q.status === "Answered").length;
  const answeredMarked = questions.filter(q => q.status === "Answered & Marked for Review").length;
  const markedNo = questions.filter(q => q.status === "Marked For Review").length;
  const notAns = questions.filter(q => q.status === "Not Answered").length;

  const halves = sections.map(section => {
    const qs = questions.filter(q => q.section === section);
    const mid = Math.ceil(qs.length / 2);
    return { section, a: analyseQuestions(qs.slice(0, mid), SCHEME), b: analyseQuestions(qs.slice(mid), SCHEME) };
  });

  const mcqs = questions.filter(q => q.questionType === "MCQ");
  const optKeys = Array.from(new Set(["1", "2", "3", "4", ...mcqs.flatMap(q => [q.chosenOption, q.correctOption]).filter((o): o is string => !!o && /^[1-9]$/.test(o))])).sort();
  const opts = optKeys.map(o => ({
    o,
    chosen: mcqs.filter(q => q.chosenOption === o).length,
    key: mcqs.filter(q => q.correctOption === o).length,
    right: mcqs.filter(q => q.chosenOption === o && questionOutcome(q) === "correct").length,
  }));

  const sets = sections.flatMap(section => {
    const qs = questions.filter(q => q.section === section);
    const keys = Array.from(new Set(qs.filter(q => q.setKey).map(q => q.setKey!)));
    return keys.map((k, i) => ({ label: `${section} ${isPassageSection(section) ? "Passage" : "Set"} ${i + 1}`, n: net(qs.filter(q => q.setKey === k)) }));
  }).sort((x, y) => y.n - x.n);

  return <div className="grid gap-4 md:grid-cols-2">
    <Card title="How you handled each question" sub="Exact status recorded in your response sheet">
      <dl className="grid grid-cols-2 gap-3">
        <Stat label="Answered" value={answeredOnly} />
        <Stat label="Answered & flagged" value={answeredMarked} />
        <Stat label="Flagged, left blank" value={markedNo} />
        <Stat label="Seen, left blank" value={notAns} />
      </dl>
    </Card>

    <Card title="First half vs second half" sub="Accuracy in the first and second half of each section, in question order">
      <div className="space-y-3">
        {halves.map(h => <div key={h.section} className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-foreground">{h.section}</span>
          <span className="tabular-nums text-muted-foreground">{h.a.attempted ? pct(h.a.accuracy) : "—"} ({h.a.attempted} att.) → {h.b.attempted ? pct(h.b.accuracy) : "—"} ({h.b.attempted} att.)</span>
        </div>)}
      </div>
    </Card>

    <Card title="Answer option habits" sub="How often you picked each MCQ option, against how often it was the right answer">
      <div className={`grid gap-2 text-center ${opts.length > 4 ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-4"}`}>
        {opts.map(x => <div key={x.o} className="rounded-md border border-border p-2">
          <p className="text-sm text-muted-foreground">Option {x.o}</p>
          <p className="text-base font-semibold tabular-nums text-foreground">{x.chosen}</p>
          <p className="text-sm text-muted-foreground">key {x.key} · {x.right} right</p>
        </div>)}
      </div>
    </Card>

    <Card title="Streaks and sets" sub="Runs across the whole paper and your highest and lowest scoring sets">
      <dl className="grid grid-cols-2 gap-3">
        <Stat label="Longest correct run" value={longestRun(questions, "correct")} />
        <Stat label="Longest wrong run" value={longestRun(questions, "wrong")} />
        <Stat label="Best set" value={sets[0] ? `${sets[0].label} (${sets[0].n > 0 ? "+" : ""}${sets[0].n})` : "—"} />
        <Stat label="Weakest set" value={sets.length > 1 ? `${sets[sets.length - 1].label} (${sets[sets.length - 1].n})` : "—"} />
      </dl>
    </Card>
  </div>;
}
