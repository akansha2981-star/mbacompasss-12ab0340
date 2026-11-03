import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export default function AdminXATScores() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-xat-scores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("xat_score_submissions")
        .select("id, created_at, candidate_name, email, phone, total_score, max_score, valr_score, dm_score, qadi_score, gk_score, unattempted_penalty, accuracy")
        .order("created_at", { ascending: false }).limit(2000);
      if (error) throw error;
      return data;
    },
  });
  const rows = data || [];
  const exportCsv = () => {
    const head = ["Date", "Name", "Email", "Phone", "Score", "Max", "VALR", "DM", "QA&DI", "GK", "Skip penalty", "Accuracy"];
    const lines = rows.map((r) => [new Date(r.created_at).toISOString(), r.candidate_name, r.email, r.phone, r.total_score, r.max_score, r.valr_score, r.dm_score, r.qadi_score, r.gk_score, r.unattempted_penalty, r.accuracy].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" }));
    a.download = "xat-scores.csv"; a.click();
  };
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-foreground">XAT Score Calculator submissions</h1>
        <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>Export CSV</Button>
      </div>
      <p className="text-sm text-muted-foreground">{isLoading ? "Loading…" : `${rows.length} submissions`}</p>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["Date", "Name", "Email", "Phone", "Score", "VALR", "DM", "QA&DI", "GK", "Penalty"].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="whitespace-nowrap px-3 py-2">{new Date(r.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</td>
              <td className="px-3 py-2 font-semibold">{r.candidate_name}</td><td className="px-3 py-2">{r.email}</td><td className="px-3 py-2">{r.phone}</td>
              <td className="px-3 py-2 font-bold text-primary tabular-nums">{r.total_score}/{r.max_score}</td>
              <td className="px-3 py-2 tabular-nums">{r.valr_score}</td><td className="px-3 py-2 tabular-nums">{r.dm_score}</td><td className="px-3 py-2 tabular-nums">{r.qadi_score}</td><td className="px-3 py-2 tabular-nums">{r.gk_score}</td><td className="px-3 py-2 tabular-nums">{r.unattempted_penalty}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
