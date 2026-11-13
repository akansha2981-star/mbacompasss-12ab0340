import { useState, type ReactNode } from "react";
import { LayoutGrid, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CollegeDataColumn<T> {
  label: string;
  value: (row: T) => ReactNode;
}

export default function CollegeDataDossiers<T>({ rows, columns, label }: {
  rows: T[];
  columns: CollegeDataColumn<T>[];
  label: string;
}) {
  const [table, setTable] = useState(false);
  if (!rows.length) return null;
  return <div className="min-w-0">
    <div className="mb-4 flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground">{rows.length} {label.toLowerCase()}</span>
      <div className="hidden sm:flex items-center gap-1" role="group" aria-label={`${label} view`}>
        <Button size="icon" variant={table ? "ghost" : "secondary"} aria-label={`Card view: ${label}`} aria-pressed={!table} title="Card view" onClick={() => setTable(false)}><LayoutGrid /></Button>
        <Button size="icon" variant={table ? "secondary" : "ghost"} aria-label={`Compare ${label.toLowerCase()} in table`} aria-pressed={table} title="Compare in table" onClick={() => setTable(true)}><Table2 /></Button>
      </div>
    </div>
    <div className={table ? "grid gap-3 sm:hidden" : "grid gap-3 sm:grid-cols-2"}>
      {rows.map((row, index) => <article key={index} className="college-dossier min-w-0 rounded-lg border border-border bg-card p-4 sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">{index + 1}</span>
          <h4 className="font-heading text-base font-bold text-foreground">{columns[0]?.value(row)}</h4>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {columns.slice(1).map((column) => <div key={column.label} className="min-w-0">
            <dt className="mb-1 text-sm text-muted-foreground">{column.label}</dt>
            <dd className="text-sm font-semibold text-foreground break-words">{column.value(row) || "—"}</dd>
          </div>)}
        </dl>
      </article>)}
    </div>
    {table && <div className="hidden sm:block overflow-x-auto rounded-lg border border-border" tabIndex={0} aria-label={`${label} comparison`}>
      <table className="college-comparison w-full text-sm">
        <caption className="sr-only">{label}</caption>
        <thead><tr>{columns.map((column) => <th key={column.label} scope="col">{column.label}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index}>{columns.map((column, i) => i === 0
          ? <th key={column.label} scope="row">{column.value(row)}</th>
          : <td key={column.label}>{column.value(row) || "—"}</td>)}</tr>)}</tbody>
      </table>
    </div>}
  </div>;
}