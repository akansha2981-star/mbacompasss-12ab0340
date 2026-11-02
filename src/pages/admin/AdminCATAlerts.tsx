import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Download, Trash2, Search } from "lucide-react";

type Signup = {
  id: string;
  email: string | null;
  whatsapp: string | null;
  alerts: string[];
  consent: boolean;
  source_path: string | null;
  created_at: string;
};

const PAGE = 1000;

export default function AdminCATAlerts() {
  const [rows, setRows] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const all: Signup[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("cat_alert_signups")
        .select("id, email, whatsapp, alerts, consent, source_path, created_at")
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) { toast.error(error.message); break; }
      all.push(...((data ?? []) as Signup[]));
      if (!data || data.length < PAGE) break;
    }
    setRows(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => `${r.email ?? ""} ${r.whatsapp ?? ""} ${r.source_path ?? ""}`.toLowerCase().includes(t));
  }, [rows, q]);

  const exportCsv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = ["Email,WhatsApp,Alerts,Consent,Signed up from,Date"]
      .concat(filtered.map((r) => [r.email ?? "", r.whatsapp ?? "", (r.alerts ?? []).join(" | "), r.consent ? "Yes" : "No", r.source_path ?? "", new Date(r.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })].map(esc).join(",")))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "cat-2026-alerts.csv";
    a.click();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this signup?")) return;
    const { error } = await supabase.from("cat_alert_signups").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success("Deleted");
  };

  const emails = rows.filter((r) => r.email).length;
  const whatsapp = rows.filter((r) => r.whatsapp).length;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">CAT 2026 Alerts</h1>
        <p className="text-sm text-muted-foreground">Students who asked for CAT 2026 answer key, result and cut-off alerts.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[["Total signups", rows.length], ["With email", emails], ["With WhatsApp", whatsapp]].map(([l, v]) => (
          <div key={l as string} className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{l}</p>
            <p className="text-2xl font-semibold text-foreground">{v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email, WhatsApp or page" className="pl-9" />
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}><Download className="mr-2 h-4 w-4" />Download CSV</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="cat-table w-full">
          <thead><tr><th className="text-left">Email</th><th className="text-left">WhatsApp</th><th className="text-left">Alerts</th><th className="text-left">Signed up from</th><th className="text-left">Date</th><th /></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center text-muted-foreground">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-muted-foreground">No signups yet</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.email || "—"}</td>
                <td>{r.whatsapp || "—"}</td>
                <td>{(r.alerts ?? []).join(", ") || "—"}</td>
                <td>{r.source_path || "—"}</td>
                <td className="whitespace-nowrap">{new Date(r.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</td>
                <td><Button size="icon" variant="ghost" onClick={() => remove(r.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
