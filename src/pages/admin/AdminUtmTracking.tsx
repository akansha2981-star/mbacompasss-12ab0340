import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Download, Link2, RefreshCw, Upload, ShieldCheck, Plus, Check, X } from "lucide-react";
import { UTM_DATE_RANGES, growthPct, rangeBounds, type UtmDateRange } from "@/lib/utmEngine";
import { approvePendingUrl, bulkImportUtmLinks, createUtmLink, migrateExistingLinks, runUtmHealthCheck } from "@/lib/utm.functions";

const db = supabase as any;
const RANGE_LABEL: Record<UtmDateRange, string> = {
  today: "Today", yesterday: "Yesterday", "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days",
  this_month: "This month", prev_month: "Previous month", all: "All time", custom: "Custom",
};
type SortKey = "clicks" | "uniques" | "sessions" | "conversions" | "rate" | "growth" | "last" | "created" | "total";

const origin = () => (typeof window !== "undefined" && /mbacompass\.in$/.test(window.location.hostname) ? "https://mbacompass.in" : typeof window !== "undefined" ? window.location.origin : "https://mbacompass.in");
const shortUrl = (code: string) => `${origin()}/go/${code}`;
const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Copied"); };

function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return toast.error("Nothing to export");
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = name;
  a.click();
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const split = (l: string) => { const out: string[] = []; let cur = "", q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === "," && !q) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out.map((s) => s.trim()); };
  const head = split(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((l) => { const v = split(l); return Object.fromEntries(head.map((h, i) => [h, v[i] ?? ""])); });
}

const Stat = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="text-xl font-semibold text-foreground tabular-nums">{value}</p>
    {hint ? <p className="text-sm text-muted-foreground truncate">{hint}</p> : null}
  </div>
);

const HealthBadge = ({ s }: { s: string }) => {
  const tone = s === "healthy" ? "bg-primary/10 text-primary" : s === "redirected" || s === "blocked" ? "bg-accent text-accent-foreground" : s === "unchecked" ? "bg-muted text-muted-foreground" : "bg-destructive/10 text-destructive";
  return <span className={`rounded-full px-2 py-0.5 text-sm ${tone}`}>{s}</span>;
};

export default function AdminUtmTracking() {
  const [range, setRange] = useState<UtmDateRange>("30d");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [links, setLinks] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, any>>({});
  const [brands, setBrands] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [conversions, setConversions] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<Record<string, { label: string; clicks: number }[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fBrand, setFBrand] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [sort, setSort] = useState<SortKey>("clicks");
  const [busy, setBusy] = useState("");

  const createFn = useServerFn(createUtmLink);
  const bulkFn = useServerFn(bulkImportUtmLinks);
  const migrateFn = useServerFn(migrateExistingLinks);
  const healthFn = useServerFn(runUtmHealthCheck);
  const approveFn = useServerFn(approvePendingUrl);

  const bounds = useMemo(() => rangeBounds(range, new Date(), custom), [range, custom]);

  const loadStatic = useCallback(async () => {
    const [l, b, c, d, p, s, v] = await Promise.all([
      db.from("utm_links").select("*").order("created_at", { ascending: false }).limit(5000),
      db.from("utm_brands").select("*").order("name"),
      db.from("utm_campaigns").select("*").order("name"),
      db.from("utm_allowed_domains").select("*").order("domain"),
      db.from("utm_pending_urls").select("*").order("hits", { ascending: false }).limit(200),
      db.from("utm_settings").select("*").eq("id", 1).maybeSingle(),
      db.from("utm_conversions").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    setLinks(l.data ?? []); setBrands(b.data ?? []); setCampaigns(c.data ?? []); setDomains(d.data ?? []);
    setPending(p.data ?? []); setSettings(s.data); setConversions(v.data ?? []);
  }, []);

  const loadRange = useCallback(async () => {
    const [st, ...bd] = await Promise.all([
      db.rpc("utm_link_stats", { p_from: bounds.from, p_to: bounds.to }),
      ...["day", "device", "browser", "os", "country", "referrer_host", "page_path"].map((dim) => db.rpc("utm_breakdown", { p_from: bounds.from, p_to: bounds.to, p_dim: dim })),
    ]);
    setStats(Object.fromEntries((st.data ?? []).map((r: any) => [r.link_id, r])));
    const dims = ["day", "device", "browser", "os", "country", "referrer_host", "page_path"];
    setBreakdown(Object.fromEntries(dims.map((d, i) => [d, (bd[i].data ?? []).map((r: any) => ({ label: r.label, clicks: Number(r.clicks) }))])));
  }, [bounds]);

  const refresh = useCallback(async (manual = false) => {
    setLoading(true);
    try {
      await Promise.all([loadStatic(), loadRange()]);
      if (manual) toast.success(`Updated at ${new Date().toLocaleTimeString()}`);
    } catch (e: any) {
      toast.error(`Could not refresh: ${e?.message ?? "unknown error"}`);
    } finally { setLoading(false); }
  }, [loadStatic, loadRange]);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { const t = setInterval(() => loadRange(), 60_000); return () => clearInterval(t); }, [loadRange]);

  const rows = useMemo(() => links.map((l) => {
    const s = stats[l.id] ?? {};
    const clicks = Number(s.clicks ?? 0), conv = Number(s.conversions ?? 0);
    return { ...l, r_clicks: clicks, r_uniques: Number(s.uniques ?? 0), r_sessions: Number(s.sessions ?? 0), r_returning: Number(s.returning_visitors ?? 0), r_conv: conv, r_rate: clicks ? (conv / clicks) * 100 : 0, r_growth: growthPct(clicks, Number(s.prev_clicks ?? 0)) };
  }), [links, stats]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter((r) => (!fBrand || r.brand_key === fBrand) && (!fStatus || r.status === fStatus)
      && (!q || [r.college_name, r.destination_url, r.code, r.utm_campaign, r.host, r.origin_page].some((v) => String(v || "").toLowerCase().includes(q))));
    const val = (r: any): number => ({ clicks: r.r_clicks, uniques: r.r_uniques, sessions: r.r_sessions, conversions: r.r_conv, rate: r.r_rate, growth: r.r_growth ?? -1e9, last: r.last_clicked_at ? Date.parse(r.last_clicked_at) : 0, created: Date.parse(r.created_at), total: r.total_clicks } as Record<SortKey, number>)[sort];
    return [...list].sort((a, b) => val(b) - val(a));
  }, [rows, search, fBrand, fStatus, sort]);

  const totals = useMemo(() => {
    const sum = (k: string) => rows.reduce((a, r) => a + (r[k] || 0), 0);
    const top = (arr: any[], key: string) => arr.sort((a, b) => b[key] - a[key])[0];
    const byCollege = new Map<string, number>(), byCamp = new Map<string, number>();
    for (const r of rows) { if (r.college_name) byCollege.set(r.college_name, (byCollege.get(r.college_name) || 0) + r.r_clicks); byCamp.set(r.utm_campaign, (byCamp.get(r.utm_campaign) || 0) + r.r_clicks); }
    const best = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0];
    const clicks = sum("r_clicks"), conv = sum("r_conv");
    const topLink = top([...rows], "r_clicks");
    return {
      links: rows.length, active: rows.filter((r) => r.status === "active").length, clicks, uniques: sum("r_uniques"), sessions: sum("r_sessions"),
      returning: sum("r_returning"), conv, rate: clicks ? ((conv / clicks) * 100).toFixed(1) : "0.0",
      colleges: new Set(rows.map((r) => r.college_id).filter(Boolean)).size, campaigns: new Set(rows.map((r) => r.utm_campaign)).size,
      topCollege: best(byCollege), topCampaign: best(byCamp), topLink: topLink && topLink.r_clicks ? topLink : null,
      review: rows.filter((r) => r.college_needs_review).length,
    };
  }, [rows]);

  const colleges = useMemo(() => {
    const m = new Map<string, any>();
    for (const r of rows) {
      const k = r.college_name || "Needs college review";
      const e = m.get(k) ?? { name: k, links: [], clicks: 0, uniques: 0, conv: 0, total: 0, campaigns: new Set<string>() };
      e.links.push(r); e.clicks += r.r_clicks; e.uniques += r.r_uniques; e.conv += r.r_conv; e.total += r.total_clicks; e.campaigns.add(r.utm_campaign);
      m.set(k, e);
    }
    return [...m.values()].sort((a, b) => b.clicks - a.clicks || b.total - a.total);
  }, [rows]);

  const exportRows = (list: any[]) => list.map((r) => ({
    college: r.college_name ?? "", tracking_link: shortUrl(r.code), destination: r.destination_url, final_utm_url: r.final_url,
    brand: r.brand_key, source: r.utm_source, medium: r.utm_medium, campaign: r.utm_campaign, content: r.utm_content, term: r.utm_term,
    status: r.status, health: r.health_status, clicks_in_range: r.r_clicks, unique_visitors: r.r_uniques, sessions: r.r_sessions,
    conversions: r.r_conv, conversion_rate: r.r_rate.toFixed(1), lifetime_clicks: r.total_clicks, last_clicked: r.last_clicked_at ?? "",
    created: r.created_at, origin_page: r.origin_page ?? "", module: r.origin_module ?? "",
  }));

  const updateLink = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await db.from("utm_links").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    setLinks((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  // ── Create link form ──
  const [form, setForm] = useState({ destination: "", brand: "mba_compass", campaign: "college_application", medium: "", content: "", term: "" });
  const submitCreate = async () => {
    setBusy("create");
    try {
      const r = await createFn({ data: { ...form, medium: form.medium || undefined } });
      copy(shortUrl(r.code));
      toast.success(r.created ? "New tracking link created and copied" : "Existing tracking link reused and copied");
      setForm((f) => ({ ...f, destination: "", content: "", term: "" }));
      await loadStatic();
    } catch (e: any) { toast.error(e?.message || "Failed"); }
    setBusy("");
  };

  const onImport = async (file: File) => {
    const parsed = parseCsv(await file.text());
    const data = parsed.map((r) => ({ destination: r.destination || r.url || r.destination_url || "", brand: r.brand || undefined, campaign: r.campaign || undefined, medium: r.medium || undefined, content: r.content || undefined, term: r.term || undefined, collegeId: r.college_id || null })).filter((r) => r.destination);
    if (!data.length) return toast.error("No rows found. The first column header must be 'destination'.");
    setBusy("import");
    try {
      const r = await bulkFn({ data: { rows: data } });
      toast.success(`${r.created} created, ${r.reused} reused${r.errors.length ? `, ${r.errors.length} skipped` : ""}`);
      if (r.errors.length) console.warn(r.errors);
      await loadStatic();
    } catch (e: any) { toast.error(e?.message || "Import failed"); }
    setBusy("");
  };

  const BarList = ({ title, items }: { title: string; items: { label: string; clicks: number }[] }) => {
    const max = Math.max(1, ...items.map((i) => i.clicks));
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-base font-semibold text-foreground">{title}</p>
        {items.length === 0 ? <p className="text-sm text-muted-foreground">No clicks in this period.</p> : (
          <div className="space-y-2">
            {items.slice(0, 10).map((i) => (
              <div key={i.label}>
                <div className="flex justify-between text-sm"><span className="truncate text-foreground">{i.label}</span><span className="tabular-nums text-muted-foreground">{i.clicks}</span></div>
                <div className="h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${(i.clicks / max) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const LinkTable = ({ list }: { list: any[] }) => (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[1100px] text-sm">
        <thead className="bg-muted/40 text-left text-muted-foreground">
          <tr>
            <th className="p-3">#</th><th className="p-3">College / destination</th><th className="p-3">Campaign</th>
            <th className="p-3 text-right">Clicks</th><th className="p-3 text-right">Unique</th><th className="p-3 text-right">Conv.</th>
            <th className="p-3 text-right">Growth</th><th className="p-3 text-right">Lifetime</th><th className="p-3">Health</th><th className="p-3">Status</th><th className="p-3">Link</th>
          </tr>
        </thead>
        <tbody>
          {list.slice(0, 500).map((r, i) => (
            <tr key={r.id} className="border-t border-border align-top hover:bg-primary/5">
              <td className="p-3 tabular-nums text-muted-foreground">{i + 1}</td>
              <td className="p-3 max-w-xs">
                <p className="font-semibold text-foreground">{r.college_name || <span className="text-destructive">Needs college review</span>}</p>
                <a href={r.destination_url} data-utm="off" target="_blank" rel="noreferrer" className="block truncate text-muted-foreground hover:text-primary">{r.destination_url}</a>
              </td>
              <td className="p-3"><p className="text-foreground">{r.utm_campaign}</p><p className="text-muted-foreground">{r.utm_medium}{r.utm_content ? ` · ${r.utm_content}` : ""}</p></td>
              <td className="p-3 text-right tabular-nums font-semibold">{r.r_clicks}</td>
              <td className="p-3 text-right tabular-nums">{r.r_uniques}</td>
              <td className="p-3 text-right tabular-nums">{r.r_conv}{r.r_clicks ? <span className="text-muted-foreground"> ({r.r_rate.toFixed(1)}%)</span> : null}</td>
              <td className={`p-3 text-right tabular-nums ${r.r_growth == null ? "text-muted-foreground" : r.r_growth >= 0 ? "text-primary" : "text-destructive"}`}>{r.r_growth == null ? "—" : `${r.r_growth > 0 ? "+" : ""}${r.r_growth}%`}</td>
              <td className="p-3 text-right tabular-nums">{r.total_clicks}</td>
              <td className="p-3"><HealthBadge s={r.health_status} /></td>
              <td className="p-3">
                <select value={r.status} onChange={(e) => updateLink(r.id, { status: e.target.value })} className="rounded-md border border-border bg-background px-2 py-1">
                  <option value="active">Active</option><option value="paused">Paused</option><option value="archived">Archived</option>
                </select>
              </td>
              <td className="p-3 whitespace-nowrap">
                <Button size="sm" variant="outline" onClick={() => copy(shortUrl(r.code))}><Copy className="mr-1 h-3.5 w-3.5" />/go/{r.code}</Button>
                <button className="ml-2 text-sm text-primary hover:underline" onClick={() => copy(r.final_url)}>UTM URL</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {list.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No tracking links yet. Create one or run the migration.</p> : null}
      {list.length > 500 ? <p className="p-3 text-sm text-muted-foreground">Showing first 500. Use search or export for the rest.</p> : null}
    </div>
  );

  const [collegeQ, setCollegeQ] = useState("");
  const [newBrand, setNewBrand] = useState({ key: "", name: "", utm_source: "" });
  const [newCamp, setNewCamp] = useState({ key: "", name: "", default_medium: "website" });
  const [newDomain, setNewDomain] = useState("");

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2"><Link2 className="h-6 w-6 text-primary" /> UTM Tracking</h1>
          <p className="text-sm text-muted-foreground">Every outbound college link on the site is routed through one tracker, reused when it already exists.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={range} onChange={(e) => setRange(e.target.value as UtmDateRange)} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            {UTM_DATE_RANGES.map((r) => <option key={r} value={r}>{RANGE_LABEL[r]}</option>)}
          </select>
          {range === "custom" ? (<>
            <Input type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="w-40" />
            <Input type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className="w-40" />
          </>) : null}
          <Button variant="outline" onClick={() => refresh(true)} disabled={loading}><RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex h-auto flex-wrap justify-start">
          {[["overview", "Overview"], ["links", "All Links"], ["colleges", "College-wise"], ["campaigns", "Campaigns & Brands"], ["analytics", "Traffic Analytics"], ["conversions", "Conversions"], ["import", "Import & Migration"], ["health", "Link Health"], ["settings", "Settings"]].map(([v, l]) => (
            <TabsTrigger key={v} value={v}>{l}{v === "import" && pending.length ? ` (${pending.length})` : ""}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Tracking links" value={totals.links} hint={`${totals.active} active`} />
            <Stat label="Clicks / redirects" value={totals.clicks} />
            <Stat label="Sessions" value={totals.sessions} />
            <Stat label="Unique visitors" value={totals.uniques} hint={`${totals.returning} returning`} />
            <Stat label="Conversions" value={totals.conv} hint={`${totals.rate}% rate`} />
            <Stat label="Colleges tracked" value={totals.colleges} hint={totals.review ? `${totals.review} links need review` : undefined} />
            <Stat label="Campaigns" value={totals.campaigns} />
            <Stat label="Top campaign" value={totals.topCampaign?.[1] ? totals.topCampaign[1] : "—"} hint={totals.topCampaign?.[1] ? totals.topCampaign[0] : "No clicks yet"} />
            <Stat label="Top college" value={totals.topCollege?.[1] || "—"} hint={totals.topCollege?.[1] ? totals.topCollege[0] : "No clicks yet"} />
            <Stat label="Top link" value={totals.topLink?.r_clicks ?? "—"} hint={totals.topLink ? `/go/${totals.topLink.code} · ${totals.topLink.college_name ?? totals.topLink.host}` : "No clicks yet"} />
          </div>
          <BarList title={`Clicks by day (${RANGE_LABEL[range]})`} items={breakdown.day ?? []} />
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-base font-semibold text-foreground">Create or fetch a tracking link</p>
            <div className="grid gap-2 md:grid-cols-6">
              <Input className="md:col-span-2" placeholder="https://college.edu/apply" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
              <select value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="rounded-md border border-border bg-background px-2 text-sm">{brands.map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}</select>
              <select value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} className="rounded-md border border-border bg-background px-2 text-sm">{campaigns.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}</select>
              <Input placeholder="Medium (optional)" value={form.medium} onChange={(e) => setForm({ ...form, medium: e.target.value })} />
              <Input placeholder="Content / placement" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
            <Button onClick={submitCreate} disabled={!form.destination || busy === "create"}><Plus className="mr-1 h-4 w-4" />Get tracking link</Button>
          </div>
        </TabsContent>

        <TabsContent value="links" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input className="max-w-sm" placeholder="Search college, URL, campaign, code…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={fBrand} onChange={(e) => setFBrand(e.target.value)} className="rounded-md border border-border bg-background px-2 text-sm"><option value="">All brands</option>{brands.map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}</select>
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="rounded-md border border-border bg-background px-2 text-sm"><option value="">All statuses</option><option value="active">Active</option><option value="paused">Paused</option><option value="archived">Archived</option></select>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="rounded-md border border-border bg-background px-2 text-sm">
              <option value="clicks">Rank: clicks in period</option><option value="total">Rank: all-time clicks</option><option value="uniques">Rank: unique visitors</option>
              <option value="sessions">Rank: sessions</option><option value="conversions">Rank: conversions</option><option value="rate">Rank: conversion rate</option>
              <option value="growth">Rank: traffic growth</option><option value="last">Last accessed</option><option value="created">Date created</option>
            </select>
            <Button variant="outline" onClick={() => downloadCsv(`utm-links-${range}.csv`, exportRows(filtered))}><Download className="mr-1 h-4 w-4" />Export CSV</Button>
          </div>
          <LinkTable list={filtered} />
        </TabsContent>

        <TabsContent value="colleges" className="space-y-3">
          <Input className="max-w-sm" placeholder="Search a college…" value={collegeQ} onChange={(e) => setCollegeQ(e.target.value)} />
          {colleges.filter((c) => !collegeQ || c.name.toLowerCase().includes(collegeQ.toLowerCase())).slice(0, 100).map((c) => (
            <div key={c.name} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-semibold text-foreground">{c.name}</p>
                <p className="text-sm text-muted-foreground">{c.links.length} links · {c.campaigns.size} campaigns · {c.clicks} clicks ({c.uniques} unique) · {c.conv} conversions · {c.total} lifetime</p>
              </div>
              <div className="space-y-1">
                {c.links.map((l: any) => (
                  <div key={l.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <Button size="sm" variant="outline" onClick={() => copy(shortUrl(l.code))}><Copy className="mr-1 h-3.5 w-3.5" />Copy</Button>
                    <span className="text-foreground">/go/{l.code}</span>
                    <span className="text-muted-foreground truncate max-w-md">{l.destination_url}</span>
                    <span className="text-muted-foreground">· {l.utm_campaign} · {l.r_clicks} clicks</span>
                    {l.college_needs_review ? <CollegeAssign link={l} onDone={loadStatic} /> : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <p className="text-base font-semibold">Campaigns</p>
              {campaigns.map((c) => {
                const cr = rows.filter((r) => r.utm_campaign.includes(`_${c.key}_`) || r.utm_campaign.endsWith(`_${c.key}`) || r.utm_campaign.includes(c.key));
                return (
                  <div key={c.id} className="flex items-center justify-between gap-2 border-t border-border pt-2 text-sm">
                    <div><p className="font-semibold">{c.name}</p><p className="text-muted-foreground">{c.key} · default medium {c.default_medium}</p></div>
                    <p className="text-muted-foreground tabular-nums">{cr.length} links · {cr.reduce((a, r) => a + r.r_clicks, 0)} clicks · {cr.reduce((a, r) => a + r.r_conv, 0)} conv.</p>
                  </div>
                );
              })}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <Input placeholder="key e.g. paid_ads" value={newCamp.key} onChange={(e) => setNewCamp({ ...newCamp, key: e.target.value })} />
                <Input placeholder="Name" value={newCamp.name} onChange={(e) => setNewCamp({ ...newCamp, name: e.target.value })} />
                <Input placeholder="Medium" value={newCamp.default_medium} onChange={(e) => setNewCamp({ ...newCamp, default_medium: e.target.value })} />
              </div>
              <Button size="sm" disabled={!newCamp.key || !newCamp.name} onClick={async () => {
                const key = newCamp.key.toLowerCase().replace(/[^a-z0-9]+/g, "_");
                const { error } = await db.from("utm_campaigns").insert({ ...newCamp, key });
                if (error) return toast.error(error.message);
                setNewCamp({ key: "", name: "", default_medium: "website" }); loadStatic();
              }}><Plus className="mr-1 h-4 w-4" />Add campaign</Button>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <p className="text-base font-semibold">Brands</p>
              {brands.map((b) => {
                const br = rows.filter((r) => r.brand_key === b.key);
                return (
                  <div key={b.key} className="flex items-center justify-between gap-2 border-t border-border pt-2 text-sm">
                    <div><p className="font-semibold">{b.name}</p><p className="text-muted-foreground">utm_source={b.utm_source}</p></div>
                    <p className="text-muted-foreground tabular-nums">{br.length} links · {br.reduce((a, r) => a + r.r_clicks, 0)} clicks</p>
                  </div>
                );
              })}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <Input placeholder="key" value={newBrand.key} onChange={(e) => setNewBrand({ ...newBrand, key: e.target.value })} />
                <Input placeholder="Name" value={newBrand.name} onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })} />
                <Input placeholder="utm_source" value={newBrand.utm_source} onChange={(e) => setNewBrand({ ...newBrand, utm_source: e.target.value })} />
              </div>
              <Button size="sm" disabled={!newBrand.key || !newBrand.name || !newBrand.utm_source} onClick={async () => {
                const { error } = await db.from("utm_brands").insert({ ...newBrand, key: newBrand.key.toLowerCase().replace(/[^a-z0-9]+/g, "_") });
                if (error) return toast.error(error.message);
                setNewBrand({ key: "", name: "", utm_source: "" }); loadStatic();
              }}><Plus className="mr-1 h-4 w-4" />Add brand</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="grid gap-3 md:grid-cols-2">
          <BarList title="Clicks by day" items={breakdown.day ?? []} />
          <BarList title="Device" items={breakdown.device ?? []} />
          <BarList title="Browser" items={breakdown.browser ?? []} />
          <BarList title="Operating system" items={breakdown.os ?? []} />
          <BarList title="Country" items={breakdown.country ?? []} />
          <BarList title="Referral source" items={breakdown.referrer_host ?? []} />
          <div className="md:col-span-2"><BarList title="Pages sending clicks" items={breakdown.page_path ?? []} /></div>
        </TabsContent>

        <TabsContent value="conversions" className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4 text-sm space-y-2">
            <p className="text-base font-semibold">How conversions are recorded</p>
            <p className="text-muted-foreground">Every redirect adds <code>mc_tid</code> to the college URL. A partner college or B-School Buzz can report an application by calling:</p>
            <code className="block break-all rounded-md bg-muted p-2">{origin()}/api/public/utm-conversion?key=YOUR_KEY&tid=MC_TID&event=application</code>
            <p className="text-muted-foreground">The key is in Settings. Each click counts once per event type.</p>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-muted-foreground"><tr><th className="p-3">When</th><th className="p-3">Event</th><th className="p-3">College</th><th className="p-3">Campaign</th><th className="p-3 text-right">Value</th></tr></thead>
              <tbody>
                {conversions.map((c) => { const l = links.find((x) => x.id === c.link_id); return (
                  <tr key={c.id} className="border-t border-border"><td className="p-3">{new Date(c.created_at).toLocaleString("en-IN")}</td><td className="p-3">{c.event_type}</td><td className="p-3">{l?.college_name ?? l?.host ?? "—"}</td><td className="p-3">{l?.utm_campaign ?? "—"}</td><td className="p-3 text-right">{c.value ?? "—"}</td></tr>
                ); })}
              </tbody>
            </table>
            {conversions.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No conversions reported yet.</p> : null}
          </div>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <p className="text-base font-semibold">Convert existing site links</p>
              <p className="text-sm text-muted-foreground">Scans college websites, application links, cut-off table links, institutes, exams, banners and coaching links, and creates or reuses a tracking link for each.</p>
              <Button disabled={busy === "migrate"} onClick={async () => {
                setBusy("migrate");
                try { const r = await migrateFn(); toast.success(r.report.map((x) => `${x.source}: ${x.created} new, ${x.reused} reused`).join(" · ") || "Nothing found"); await loadStatic(); }
                catch (e: any) { toast.error(e?.message || "Failed"); }
                setBusy("");
              }}><RefreshCw className={`mr-1 h-4 w-4 ${busy === "migrate" ? "animate-spin" : ""}`} />Run migration</Button>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <p className="text-base font-semibold">Bulk upload (CSV)</p>
              <p className="text-sm text-muted-foreground">Columns: destination, brand, campaign, medium, content, term, college_id. Existing matches are reused, never duplicated.</p>
              <div className="flex gap-2">
                <label className="inline-flex cursor-pointer items-center rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
                  <Upload className="mr-1 h-4 w-4" />{busy === "import" ? "Importing…" : "Choose CSV"}
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }} />
                </label>
                <Button variant="outline" onClick={() => downloadCsv("utm-import-template.csv", [{ destination: "https://college.edu/apply", brand: "mba_compass", campaign: "college_application", medium: "website", content: "apply_button", term: "", college_id: "" }])}>Template</Button>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-base font-semibold">Links waiting for approval ({pending.length})</p>
            <p className="text-sm text-muted-foreground">Outbound links to domains not yet known to the site. Visitors see a "you are leaving" page until you approve the domain.</p>
            {pending.map((p) => (
              <div key={p.normalized_url} className="flex flex-wrap items-center gap-2 border-t border-border pt-2 text-sm">
                <span className="font-semibold">{p.host}</span>
                <span className="text-muted-foreground truncate max-w-md">{p.destination_url}</span>
                <span className="text-muted-foreground">{p.hits} clicks · from {p.first_seen_path || "—"}</span>
                <Button size="sm" onClick={async () => { try { await approveFn({ data: { normalizedUrl: p.normalized_url, approveDomain: true } }); toast.success("Approved"); loadStatic(); } catch (e: any) { toast.error(e?.message); } }}><Check className="mr-1 h-3.5 w-3.5" />Approve domain</Button>
                <Button size="sm" variant="outline" onClick={async () => { await db.from("utm_pending_urls").delete().eq("normalized_url", p.normalized_url); loadStatic(); }}><X className="mr-1 h-3.5 w-3.5" />Dismiss</Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={busy === "health"} onClick={async () => {
              setBusy("health");
              try { const r = await healthFn({ data: {} }); toast.success(`Checked ${r.checked} links, ${r.broken} broken`); await loadStatic(); }
              catch (e: any) { toast.error(e?.message || "Failed"); }
              setBusy("");
            }}><ShieldCheck className="mr-1 h-4 w-4" />{busy === "health" ? "Checking…" : "Check next 40 links"}</Button>
            <p className="text-sm text-muted-foreground">Oldest-checked links go first. Some college sites block automated checks and show as "blocked".</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {["healthy", "redirected", "blocked", "broken", "unreachable"].map((s) => <Stat key={s} label={s} value={links.filter((l) => l.health_status === s).length} />)}
          </div>
          <LinkTable list={rows.filter((r) => ["broken", "unreachable", "blocked", "redirected"].includes(r.health_status))} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {settings ? (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3 max-w-2xl">
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-sm">Default brand<select value={settings.default_brand} onChange={(e) => setSettings({ ...settings, default_brand: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2">{brands.map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}</select></label>
                <label className="text-sm">Default medium<Input className="mt-1" value={settings.default_medium} onChange={(e) => setSettings({ ...settings, default_medium: e.target.value })} /></label>
                <label className="text-sm">Campaign year<Input className="mt-1" value={settings.campaign_year} onChange={(e) => setSettings({ ...settings, campaign_year: e.target.value })} /></label>
              </div>
              <p className="text-sm text-muted-foreground">Changing the year affects new links only; existing links keep their history.</p>
              <div className="text-sm">
                <p className="font-semibold">Conversion key</p>
                <div className="flex items-center gap-2"><code className="rounded-md bg-muted px-2 py-1 break-all">{settings.conversion_secret}</code><Button size="sm" variant="outline" onClick={() => copy(settings.conversion_secret)}><Copy className="h-3.5 w-3.5" /></Button></div>
              </div>
              <Button onClick={async () => {
                const { error } = await db.from("utm_settings").update({ default_brand: settings.default_brand, default_medium: settings.default_medium, campaign_year: settings.campaign_year, updated_at: new Date().toISOString() }).eq("id", 1);
                error ? toast.error(error.message) : toast.success("Saved");
              }}>Save settings</Button>
            </div>
          ) : null}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2 max-w-2xl">
            <p className="text-base font-semibold">Approved destination domains</p>
            <p className="text-sm text-muted-foreground">College websites from the college list and domains with existing links are approved automatically.</p>
            <div className="flex gap-2"><Input placeholder="college.edu" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} />
              <Button onClick={async () => { const d = newDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]; if (!d) return; const { error } = await db.from("utm_allowed_domains").upsert({ domain: d }); if (error) return toast.error(error.message); setNewDomain(""); loadStatic(); }}>Add</Button></div>
            {domains.map((d) => (
              <div key={d.domain} className="flex items-center justify-between border-t border-border pt-2 text-sm"><span>{d.domain}</span>
                <button className="text-destructive hover:underline" onClick={async () => { await db.from("utm_allowed_domains").delete().eq("domain", d.domain); loadStatic(); }}>Remove</button></div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-2 max-w-2xl text-sm">
            <p className="text-base font-semibold">For B-School Buzz</p>
            <p className="text-muted-foreground">On the B-School Buzz website, point outbound links to this address so they share the same tracker and are labelled as B-School Buzz traffic:</p>
            <code className="block break-all rounded-md bg-muted p-2">{origin()}/go/r?b=b_school_buzz&amp;c=college_listing&amp;u=ENCODED_COLLEGE_URL</code>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CollegeAssign({ link, onDone }: { link: any; onDone: () => void }) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState<any[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) { setOpts([]); return; }
    const t = setTimeout(async () => {
      const { data } = await db.from("colleges").select("id,name").ilike("name", `%${q.trim()}%`).limit(8);
      setOpts(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <span className="relative inline-block">
      <Input className="h-8 w-56" placeholder="Assign college…" value={q} onChange={(e) => setQ(e.target.value)} />
      {opts.length ? (
        <span className="absolute z-10 mt-1 block w-72 rounded-md border border-border bg-popover shadow-md">
          {opts.map((o) => (
            <button key={o.id} className="block w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={async () => {
              const { error } = await db.from("utm_links").update({ college_id: o.id, college_name: o.name, college_needs_review: false }).eq("host", link.host).eq("college_needs_review", true);
              if (error) return toast.error(error.message);
              toast.success(`Assigned ${o.name} to all ${link.host} links`); onDone();
            }}>{o.name}</button>
          ))}
        </span>
      ) : null}
    </span>
  );
}
