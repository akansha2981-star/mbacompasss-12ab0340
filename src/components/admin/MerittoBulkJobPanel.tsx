import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, PlayCircle, RefreshCw, XCircle } from "lucide-react";

type Job = {
  id: string; file_name: string | null; total: number; status: string;
  resume_at: string | null; last_error: string | null; created_at: string; completed_at: string | null;
};
type Counts = Partial<Record<"pending" | "processing" | "success" | "duplicate" | "invalid" | "failed", number>>;

export const isActiveBulkJob = (status?: string | null) => status === "running" || status === "paused_limit";

export default function MerittoBulkJobPanel({ refreshKey, onActiveChange }: { refreshKey: number; onActiveChange: (active: boolean) => void }) {
  const [job, setJob] = useState<Job | null>(null);
  const [counts, setCounts] = useState<Counts>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("meritto_bulk_jobs").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
    const j = (data as Job | null) ?? null;
    setJob(j);
    onActiveChange(isActiveBulkJob(j?.status));
    if (j) {
      const { data: c } = await supabase.rpc("meritto_bulk_job_counts", { p_job: j.id });
      setCounts((c as Counts) ?? {});
    }
  }, [onActiveChange]);

  useEffect(() => { void load(); }, [load, refreshKey]);
  useEffect(() => {
    if (!isActiveBulkJob(job?.status)) return;
    const t = window.setInterval(() => { if (!document.hidden) void load(); }, 5000);
    return () => window.clearInterval(t);
  }, [job?.status, load]);

  if (!job) return null;

  const n = (k: keyof Counts) => counts[k] ?? 0;
  const remaining = n("pending") + n("processing");
  const done = Math.max(0, job.total - remaining);
  const pct = job.total ? Math.floor((done / job.total) * 100) : 0;

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try { await fn(); toast.success(msg); } catch (e: any) { toast.error(e?.message ?? "Action failed"); }
    finally { setBusy(false); void load(); }
  };
  const arm = async () => { const { error } = await supabase.rpc("meritto_bulk_arm"); if (error) throw error; };
  const resumeNow = () => act(async () => {
    const { error } = await supabase.from("meritto_bulk_jobs").update({ status: "running", resume_at: null, last_error: null, completed_at: null }).eq("id", job.id);
    if (error) throw error; await arm();
  }, "Sending resumed");
  const cancel = () => { if (confirm("Stop this upload? Leads not yet sent will not be sent.")) void act(async () => {
    const { error } = await supabase.from("meritto_bulk_jobs").update({ status: "cancelled" }).eq("id", job.id); if (error) throw error;
  }, "Upload stopped"); };
  const retryFailed = () => act(async () => {
    const { error } = await supabase.from("meritto_bulk_items").update({ status: "pending", error: null, http_status: null }).eq("job_id", job.id).eq("status", "failed");
    if (error) throw error;
    await supabase.from("meritto_bulk_jobs").update({ status: "running", completed_at: null }).eq("id", job.id);
    await arm();
  }, "Failed leads queued again");

  const exportCsv = async () => {
    const all: any[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("meritto_bulk_items").select("row_no,status,http_status,error,lead").eq("job_id", job.id).order("row_no").range(from, from + 999);
      if (error) { toast.error(error.message); return; }
      all.push(...(data ?? []));
      if ((data ?? []).length < 1000) break;
    }
    const keys = ["name", "email", "mobile", "state", "city", "campus", "course", "medium", "campaign", "source"];
    const esc = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = [["row", "status", "http", "error", ...keys].join(","), ...all.map((r) => [r.row_no, r.status, r.http_status ?? "", esc(r.error), ...keys.map((k) => esc(r.lead?.[k]))].join(","))];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `meritto-bulk-${job.id.slice(0, 8)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const statusText =
    job.status === "running" ? "Sending in the background — you can close this page"
    : job.status === "paused_limit" ? `Daily Meritto limit reached — restarts automatically at ${job.resume_at ? new Date(job.resume_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "midnight"}`
    : job.status === "completed" ? "Completed — you can upload the next file"
    : "Stopped";

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="font-semibold">Current bulk upload{job.file_name ? ` · ${job.file_name}` : ""}</div>
            <p className="text-sm text-muted-foreground">{statusText}</p>
            {job.status === "paused_limit" && job.last_error && <p className="text-sm text-muted-foreground">Last response: {job.last_error}</p>}
          </div>
          <Badge variant="outline">{pct}% done</Badge>
        </div>
        <div className="h-2 bg-muted rounded-[0.25rem] overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="grid grid-cols-3 md:grid-cols-7 gap-2 text-sm">
          <Chip label="Total" value={job.total} />
          <Chip label="Done" value={done} />
          <Chip label="Delivered" value={n("success")} />
          <Chip label="Duplicate" value={n("duplicate")} />
          <Chip label="Invalid" value={n("invalid")} />
          <Chip label="Failed" value={n("failed")} />
          <Chip label="Waiting" value={remaining} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => void load()}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
          <Button size="sm" variant="outline" onClick={() => void exportCsv()}><Download className="h-4 w-4 mr-1" />Download results</Button>
          {job.status === "paused_limit" && <Button size="sm" variant="outline" disabled={busy} onClick={() => void resumeNow()}><PlayCircle className="h-4 w-4 mr-1" />Try now</Button>}
          {n("failed") > 0 && !isActiveBulkJob(job.status) && <Button size="sm" variant="outline" disabled={busy} onClick={() => void retryFailed()}><RefreshCw className="h-4 w-4 mr-1" />Retry failed</Button>}
          {isActiveBulkJob(job.status) && <Button size="sm" variant="outline" disabled={busy} onClick={cancel}><XCircle className="h-4 w-4 mr-1" />Stop upload</Button>}
        </div>
      </CardContent>
    </Card>
  );
}

function Chip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="font-semibold">{value.toLocaleString("en-IN")}</div>
    </div>
  );
}
