import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, Eye, EyeOff, GraduationCap } from "lucide-react";
import { CUTOFF_BANDS, bandLabel, emptyCutoffRow, type CatCutoffCollege, type CatCutoffCollegeInput } from "@/lib/catCutoffColleges";

type DraftRow = CatCutoffCollegeInput & { _key: number };
let keySeq = 1;
const newDraft = (band: string): DraftRow => ({ ...emptyCutoffRow(band), _key: keySeq++ });

export default function AdminCATCutoffColleges() {
  const [band, setBand] = useState<string>(CUTOFF_BANDS[0].key);
  const [rows, setRows] = useState<CatCutoffCollege[]>([]);
  const [drafts, setDrafts] = useState<DraftRow[]>([newDraft(CUTOFF_BANDS[0].key)]);
  const [edits, setEdits] = useState<Record<string, CatCutoffCollegeInput>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cat_cutoff_colleges")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("college_name", { ascending: true });
    setLoading(false);
    if (error) return toast.error(`Load failed: ${error.message}`);
    setRows((data || []) as CatCutoffCollege[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const bandRows = rows.filter((r) => r.cutoff_band === band);

  const pickBand = (b: string) => {
    setBand(b);
    setDrafts((d) => d.map((r) => ({ ...r, cutoff_band: b })));
  };

  const setDraft = (key: number, patch: Partial<DraftRow>) =>
    setDrafts((d) => d.map((r) => (r._key === key ? { ...r, ...patch } : r)));

  const saveAll = async () => {
    const valid = drafts.filter((d) => d.college_name.trim());
    if (valid.length === 0) return toast.error("Add at least one college name.");
    setBusy(true);
    const payload = valid.map((d, i) => ({
      college_name: d.college_name.trim(),
      cutoff_band: band,
      overall_percentile: d.overall_percentile.trim(),
      fees: d.fees.trim(),
      highest_package: d.highest_package.trim(),
      average_package: d.average_package.trim(),
      apply_url: d.apply_url.trim(),
      sort_order: bandRows.length + i,
      is_active: true,
    }));
    const { error } = await supabase.from("cat_cutoff_colleges").insert(payload);
    setBusy(false);
    if (error) return toast.error(`Save failed: ${error.message}`);
    toast.success(`${valid.length} college${valid.length > 1 ? "s" : ""} added to ${bandLabel(band)} — live now.`);
    setDrafts([newDraft(band)]);
    load();
  };

  const startEdit = (r: CatCutoffCollege) =>
    setEdits((e) => ({
      ...e,
      [r.id]: {
        college_name: r.college_name, cutoff_band: r.cutoff_band,
        overall_percentile: r.overall_percentile, fees: r.fees,
        highest_package: r.highest_package, average_package: r.average_package,
        apply_url: r.apply_url, sort_order: r.sort_order, is_active: r.is_active,
      },
    }));

  const setEdit = (id: string, patch: Partial<CatCutoffCollegeInput>) =>
    setEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } }));

  const saveEdit = async (id: string) => {
    const e = edits[id];
    if (!e?.college_name.trim()) return toast.error("College name is required.");
    setBusy(true);
    const { error } = await supabase.from("cat_cutoff_colleges").update({
      college_name: e.college_name.trim(),
      overall_percentile: e.overall_percentile.trim(),
      fees: e.fees.trim(),
      highest_package: e.highest_package.trim(),
      average_package: e.average_package.trim(),
      apply_url: e.apply_url.trim(),
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    setBusy(false);
    if (error) return toast.error(`Save failed: ${error.message}`);
    toast.success("Saved.");
    setEdits((x) => { const n = { ...x }; delete n[id]; return n; });
    load();
  };

  const toggleActive = async (r: CatCutoffCollege) => {
    const { error } = await supabase.from("cat_cutoff_colleges").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) return toast.error(`Update failed: ${error.message}`);
    load();
  };

  const remove = async (r: CatCutoffCollege) => {
    if (!window.confirm(`Delete "${r.college_name}" permanently?`)) return;
    const { error } = await supabase.from("cat_cutoff_colleges").delete().eq("id", r.id);
    if (error) return toast.error(`Delete failed: ${error.message}`);
    toast.success("Deleted.");
    load();
  };

  const inputCls = "h-9 text-sm";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">CAT Cut-off Colleges</h1>
        <p className="text-sm text-muted-foreground">
          Manage the college table shown on the CAT score calculator page. Pick a band, add one or many colleges, save — they go live instantly.
        </p>
      </div>

      {/* Band picker */}
      <div className="flex flex-wrap gap-2">
        {CUTOFF_BANDS.map((b) => {
          const count = rows.filter((r) => r.cutoff_band === b.key).length;
          return (
            <button key={b.key} onClick={() => pickBand(b.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition-all ${band === b.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {b.label}{count ? <span className="ml-1.5 opacity-70">({count})</span> : null}
            </button>
          );
        })}
      </div>

      {/* Add multiple at once */}
      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Add colleges to “{bandLabel(band)}”</h2>
          <Button variant="outline" size="sm" onClick={() => setDrafts((d) => [...d, newDraft(band)])}>
            <Plus className="mr-1 h-4 w-4" /> Add another row
          </Button>
        </div>
        <div className="space-y-2">
          <div className="hidden md:grid md:grid-cols-[1.4fr_0.7fr_0.8fr_0.9fr_0.9fr_1.2fr_2rem] gap-2 text-sm font-medium text-muted-foreground">
            <span>College name *</span><span>Overall %tile</span><span>Fees (2 yrs)</span><span>Highest pkg</span><span>Average pkg</span><span>Apply link</span><span />
          </div>
          {drafts.map((d) => (
            <div key={d._key} className="grid gap-2 md:grid-cols-[1.4fr_0.7fr_0.8fr_0.9fr_0.9fr_1.2fr_2rem]">
              <Input className={inputCls} placeholder="e.g. IIM Ahmedabad" value={d.college_name} onChange={(e) => setDraft(d._key, { college_name: e.target.value })} />
              <Input className={inputCls} placeholder="99+" value={d.overall_percentile} onChange={(e) => setDraft(d._key, { overall_percentile: e.target.value })} />
              <Input className={inputCls} placeholder="₹25–27L" value={d.fees} onChange={(e) => setDraft(d._key, { fees: e.target.value })} />
              <Input className={inputCls} placeholder="₹1.1 Cr" value={d.highest_package} onChange={(e) => setDraft(d._key, { highest_package: e.target.value })} />
              <Input className={inputCls} placeholder="₹35L" value={d.average_package} onChange={(e) => setDraft(d._key, { average_package: e.target.value })} />
              <Input className={inputCls} placeholder="https://…" value={d.apply_url} onChange={(e) => setDraft(d._key, { apply_url: e.target.value })} />
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setDrafts((x) => x.filter((r) => r._key !== d._key))} disabled={drafts.length === 1}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
        <Button onClick={saveAll} disabled={busy} className="font-semibold">
          <Save className="mr-1 h-4 w-4" /> {busy ? "Saving…" : `Save all to ${bandLabel(band)}`}
        </Button>
      </section>

      {/* Existing rows in this band */}
      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-xl font-bold text-foreground">In “{bandLabel(band)}” ({bandRows.length})</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : bandRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <GraduationCap className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No colleges in this band yet. Add them above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bandRows.map((r) => {
              const e = edits[r.id];
              return (
                <div key={r.id} className={`rounded-xl border border-border p-3 ${r.is_active ? "" : "opacity-60"}`}>
                  {e ? (
                    <div className="space-y-2">
                      <div className="grid gap-2 md:grid-cols-[1.4fr_0.7fr_0.8fr_0.9fr_0.9fr_1.2fr]">
                        <Input className={inputCls} value={e.college_name} onChange={(ev) => setEdit(r.id, { college_name: ev.target.value })} />
                        <Input className={inputCls} value={e.overall_percentile} onChange={(ev) => setEdit(r.id, { overall_percentile: ev.target.value })} />
                        <Input className={inputCls} value={e.fees} onChange={(ev) => setEdit(r.id, { fees: ev.target.value })} />
                        <Input className={inputCls} value={e.highest_package} onChange={(ev) => setEdit(r.id, { highest_package: ev.target.value })} />
                        <Input className={inputCls} value={e.average_package} onChange={(ev) => setEdit(r.id, { average_package: ev.target.value })} />
                        <Input className={inputCls} value={e.apply_url} onChange={(ev) => setEdit(r.id, { apply_url: ev.target.value })} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(r.id)} disabled={busy}><Save className="mr-1 h-3.5 w-3.5" /> Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEdits((x) => { const n = { ...x }; delete n[r.id]; return n; })}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <p className="min-w-40 font-semibold text-foreground">{r.college_name}</p>
                      <p className="text-sm text-muted-foreground">%tile: <span className="text-foreground">{r.overall_percentile || "—"}</span></p>
                      <p className="text-sm text-muted-foreground">Fees: <span className="text-foreground">{r.fees || "—"}</span></p>
                      <p className="text-sm text-muted-foreground">High: <span className="text-foreground">{r.highest_package || "—"}</span></p>
                      <p className="text-sm text-muted-foreground">Avg: <span className="text-foreground">{r.average_package || "—"}</span></p>
                      <div className="ml-auto flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => startEdit(r)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleActive(r)} title={r.is_active ? "Hide from site" : "Show on site"}>
                          {r.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
