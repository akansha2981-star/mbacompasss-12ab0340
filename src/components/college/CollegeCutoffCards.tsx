import { useState } from "react";
import { BookOpen, Calendar, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Cutoff { category?: string; exam?: string; year?: string | number; percentile?: string | number }
export default function CollegeCutoffCards({ rows }: { rows: Cutoff[] }) {
  const [exam, setExam] = useState("All");
  const exams = [...new Set(rows.map(r => r.exam).filter((value): value is string => Boolean(value)))];
  const shown = exam === "All" ? rows : rows.filter(r => r.exam === exam);
  return <div>
    <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <p className="text-sm text-muted-foreground">{shown.length} published cutoff {shown.length === 1 ? "entry" : "entries"}</p>
      <GraduationCap className="h-5 w-5 text-primary" />
    </div>
    {exams.length > 1 && <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Cutoff exam filter">{["All", ...exams].map(e => <Button key={e} variant={exam === e ? "default" : "outline"} aria-pressed={exam === e} onClick={() => setExam(e)}>{e}</Button>)}</div>}
    <div className="grid gap-3 sm:grid-cols-2">
      {shown.map((row, i) => <article key={i} className="college-cutoff-card min-w-0 overflow-hidden rounded-lg border border-border bg-card">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border bg-secondary/50 px-4 py-3">
          <h3 className="break-words text-base font-bold text-foreground">{row.category || "Overall"}</h3>
          {row.exam && <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary"><BookOpen className="h-4 w-4" />{row.exam}</span>}
        </div>
        <div className="px-4 py-5"><p className="mb-1 text-sm text-muted-foreground">Percentile</p><p className="font-heading text-3xl font-bold text-foreground break-words">{row.percentile ?? "Not disclosed"}</p>
          {row.year && <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground"><Calendar className="h-4 w-4" />{row.year} admission data</p>}
        </div>
      </article>)}
    </div>
  </div>;
}