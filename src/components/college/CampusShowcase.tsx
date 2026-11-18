import { useMemo, useState, type ReactNode } from "react";
import {
  Award, BookOpen, Briefcase, CalendarClock, CheckCircle, ExternalLink, FileDown,
  GraduationCap, IndianRupee, Leaf, Sparkles, Trophy, Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/collegeMetrics";

/**
 * Data-driven "campus showcase" blocks for college pages. Everything renders from the
 * `campus_showcase` college section (admin/DB managed), and each block hides itself when
 * its data is missing, so colleges without this section are unaffected.
 */

type Stat = { value: string; label: string };
type Logo = { name: string; logo?: string; note?: string };
type Pct = { label: string; pct: number };

export type ShowcaseProgrammeCard = {
  code: string; name?: string; summary?: string; duration?: string; deadline?: string;
  fees?: string; learn_url?: string; apply_url?: string; badge?: string;
};
export type ShowcaseProgrammeDetail = {
  code: string; name: string; duration?: string; tagline?: string;
  batch_label?: string; batch_stats?: Stat[]; work_ex?: Pct[]; background_title?: string; background?: Pct[];
  curriculum_note?: string; terms?: { term: string; courses: string[] }[];
  labs?: string[]; specializations?: { group?: string; name: string; courses: string[] }[];
  fees?: { title?: string; rows: { label: string; inr: string; usd?: string }[]; total?: { inr: string; usd?: string }; notes?: string[] };
  eligibility?: { label: string; value: string }[];
  brochure_url?: string;
};
export type ShowcasePlacementReport = {
  code: string; title: string; batch?: string; highest?: string; top10?: string; average?: string;
  functions?: Pct[]; profiles?: string[]; recruiters?: string[]; report_url?: string; learn_url?: string;
};
export type CampusShowcaseData = {
  highlight_stats?: Stat[];
  firsts?: { lead?: string; big: string; noun?: string; text: string }[];
  rank_spotlight?: { rank: string; suffix?: string; body: string; label: string; year?: string }[];
  accreditation_logos?: Logo[];
  recruiter_logos?: Logo[];
  programme_groups?: { group: string; programmes: ShowcaseProgrammeCard[] }[];
  programme_details?: ShowcaseProgrammeDetail[];
  placement_reports?: ShowcasePlacementReport[];
  karma_yoga?: Stat[];
  founder?: { name: string; title?: string; quote: string };
  brochures?: { title: string; description?: string; url: string; size_label?: string; filename?: string }[];
};

const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const safeHttps = (u?: string) => (u && /^https:\/\//.test(u) ? u : "");
const safeAsset = (u?: string) => (u && (/^\/__l5e\//.test(u) || /^https:\/\//.test(u)) ? u : "");

/** Parse raw section JSON into a clean, render-safe showcase object. */
export function parseCampusShowcase(raw: unknown): CampusShowcaseData | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, any>;
  const stats = (v: unknown) => arr<any>(v).map((s) => ({ value: str(s?.value), label: str(s?.label) })).filter((s) => s.value && s.label);
  const pcts = (v: unknown) => arr<any>(v).map((s) => ({ label: str(s?.label ?? s?.name), pct: Number(s?.pct) })).filter((s) => s.label && s.pct > 0);
  const logos = (v: unknown) => arr<any>(v).map((l) => ({ name: str(l?.name), logo: safeAsset(str(l?.logo)), note: str(l?.note) })).filter((l) => l.name);
  const strings = (v: unknown) => arr<any>(v).map(str).filter(Boolean);
  const out: CampusShowcaseData = {
    highlight_stats: stats(d.highlight_stats),
    firsts: arr<any>(d.firsts).map((f) => ({ lead: str(f?.lead), big: str(f?.big), noun: str(f?.noun), text: str(f?.text) })).filter((f) => f.big && f.text),
    rank_spotlight: arr<any>(d.rank_spotlight).map((r) => ({ rank: str(r?.rank), suffix: str(r?.suffix), body: str(r?.body), label: str(r?.label), year: str(r?.year) })).filter((r) => r.rank && r.body),
    accreditation_logos: logos(d.accreditation_logos),
    recruiter_logos: logos(d.recruiter_logos).filter((l) => l.logo),
    programme_groups: arr<any>(d.programme_groups).map((g) => ({
      group: str(g?.group),
      programmes: arr<any>(g?.programmes).map((p) => ({
        code: str(p?.code), name: str(p?.name), summary: str(p?.summary), duration: str(p?.duration), deadline: str(p?.deadline),
        fees: str(p?.fees), learn_url: safeHttps(str(p?.learn_url)), apply_url: safeHttps(str(p?.apply_url)), badge: str(p?.badge),
      })).filter((p) => p.code),
    })).filter((g) => g.group && g.programmes.length > 0),
    programme_details: arr<any>(d.programme_details).map((p) => ({
      code: str(p?.code), name: str(p?.name), duration: str(p?.duration), tagline: str(p?.tagline),
      batch_label: str(p?.batch_label), batch_stats: stats(p?.batch_stats), work_ex: pcts(p?.work_ex),
      background_title: str(p?.background_title), background: pcts(p?.background),
      curriculum_note: str(p?.curriculum_note),
      terms: arr<any>(p?.terms).map((t) => ({ term: str(t?.term), courses: strings(t?.courses) })).filter((t) => t.term && t.courses.length),
      labs: strings(p?.labs),
      specializations: arr<any>(p?.specializations).map((s) => ({ group: str(s?.group), name: str(s?.name), courses: strings(s?.courses) })).filter((s) => s.name && s.courses.length),
      fees: p?.fees && typeof p.fees === "object" ? {
        title: str(p.fees.title),
        rows: arr<any>(p.fees.rows).map((r) => ({ label: str(r?.label), inr: str(r?.inr), usd: str(r?.usd) })).filter((r) => r.label && r.inr),
        total: p.fees.total ? { inr: str(p.fees.total.inr), usd: str(p.fees.total.usd) } : undefined,
        notes: strings(p.fees.notes),
      } : undefined,
      eligibility: arr<any>(p?.eligibility).map((e) => ({ label: str(e?.label), value: str(e?.value) })).filter((e) => e.label && e.value),
      brochure_url: safeAsset(str(p?.brochure_url)),
    })).filter((p) => p.code && p.name),
    placement_reports: arr<any>(d.placement_reports).map((r) => ({
      code: str(r?.code), title: str(r?.title), batch: str(r?.batch), highest: str(r?.highest), top10: str(r?.top10), average: str(r?.average),
      functions: pcts(r?.functions), profiles: strings(r?.profiles), recruiters: strings(r?.recruiters),
      report_url: safeAsset(str(r?.report_url)), learn_url: safeHttps(str(r?.learn_url)),
    })).filter((r) => r.code && r.title),
    karma_yoga: stats(d.karma_yoga),
    founder: d.founder && str(d.founder.quote) ? { name: str(d.founder.name), title: str(d.founder.title), quote: str(d.founder.quote) } : undefined,
    brochures: arr<any>(d.brochures).map((b) => ({ title: str(b?.title), description: str(b?.description), url: safeAsset(str(b?.url)), size_label: str(b?.size_label), filename: str(b?.filename) })).filter((b) => b.title && b.url),
  };
  return out;
}

/** Programme-wise CTC lines (e.g. PGPM / PGDM) for headline stats; empty unless 2+ programmes report the metric. */
export function programmeCtcLines(data: CampusShowcaseData | null | undefined, metric: "highest" | "average"): { code: string; value: string }[] {
  const lines = (data?.placement_reports || [])
    .map((r) => ({ code: r.code, value: formatMoney(r[metric]) }))
    .filter((l) => l.code && l.value);
  return lines.length >= 2 ? lines : [];
}

/* ───────────────────────── shared pieces ───────────────────────── */

const SectionShell = ({ id, icon, title, subtitle, children, accent = "from-primary via-primary/70" }: {
  id?: string; icon: ReactNode; title: string; subtitle?: string; children: ReactNode; accent?: string;
}) => (
  <Card id={id} className="overflow-hidden border-border/60 shadow-md">
    <div className={`h-1 bg-gradient-to-r ${accent} to-transparent`} />
    <CardHeader className="pb-3">
      <CardTitle className="font-heading flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">{icon}</div>
        {title}
      </CardTitle>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

export const LogoMarquee = ({ items, speed = 38, reverse = false, tile = "w-44 h-24" }: { items: Logo[]; speed?: number; reverse?: boolean; tile?: string }) => {
  if (!items.length) return null;
  const render = (l: Logo, key: string, hidden = false) => (
    <div key={key} aria-hidden={hidden || undefined} className={`shrink-0 ${tile} rounded-2xl border border-border/60 bg-background shadow-sm flex flex-col items-center justify-center gap-1.5 px-4 py-3 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40 transition-all duration-300`}>
      {l.logo ? (
        <img src={l.logo} alt={hidden ? "" : `${l.name} logo`} className="max-h-12 w-full object-contain" loading="lazy" decoding="async" />
      ) : (
        <span className="font-heading font-extrabold text-primary text-xl tracking-wide">{l.name}</span>
      )}
      {l.note && <span className="text-xs font-semibold text-muted-foreground text-center leading-tight">{l.note}</span>}
    </div>
  );
  return (
    <div className="relative overflow-hidden marquee-hover-pause -mx-1 px-1">
      <div className={`flex gap-4 w-max py-2 ${reverse ? "animate-marquee-reverse" : "animate-marquee"}`} style={{ animationDuration: `${speed}s` }}>
        {items.map((l, i) => render(l, `a-${i}`))}
        {items.map((l, i) => render(l, `b-${i}`, true))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-card via-card/70 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-card via-card/70 to-transparent" />
    </div>
  );
};

const Laurel = ({ flip = false }: { flip?: boolean }) => (
  <svg viewBox="0 0 24 64" className={`h-14 w-5 shrink-0 text-emerald-600 ${flip ? "-scale-x-100" : ""}`} aria-hidden="true">
    <path d="M18 62C8 52 6 34 12 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    {[8, 18, 28, 38, 48].map((y, i) => (
      <g key={y}>
        <ellipse cx={i < 2 ? 9 : 7} cy={y + 2} rx="5" ry="2.4" transform={`rotate(-40 ${i < 2 ? 9 : 7} ${y + 2})`} fill="currentColor" opacity="0.85" />
        <ellipse cx={i < 2 ? 16 : 15} cy={y + 6} rx="4.6" ry="2.2" transform={`rotate(35 ${i < 2 ? 16 : 15} ${y + 6})`} fill="currentColor" opacity="0.6" />
      </g>
    ))}
  </svg>
);

const Bars = ({ items, tone = "primary" }: { items: Pct[]; tone?: "primary" | "emerald" | "amber" }) => {
  const max = Math.max(...items.map((i) => i.pct), 1);
  const bar = tone === "emerald" ? "from-emerald-400 to-emerald-600" : tone === "amber" ? "from-amber-300 to-amber-500" : "from-primary/60 to-primary";
  return (
    <div className="space-y-2.5">
      {items.map((it) => (
        <div key={it.label}>
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="text-sm font-medium text-foreground">{it.label}</span>
            <span className="font-heading font-bold text-sm text-foreground">{it.pct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full bg-gradient-to-r ${bar}`} style={{ width: `${(it.pct / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const Pills = <T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) => (
  <div className="flex flex-wrap gap-2" role="tablist" aria-label={label}>
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        role="tab"
        aria-selected={value === o.value}
        onClick={() => onChange(o.value)}
        className={`rounded-full border px-4 py-2 text-sm font-bold transition-all ${value === o.value ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-primary"}`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

/** Days left until a YYYY-MM-DD deadline, counted on the India calendar (IST). */
export function daysLeftIst(deadline: string, now: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(deadline);
  if (!m) return null;
  const istNow = new Date(now.getTime() + 330 * 60_000);
  const today = Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate());
  const end = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Math.round((end - today) / 86_400_000);
}

const formatDeadline = (d: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return d;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};

/* ───────────────────────── blocks ───────────────────────── */

/** "School of Firsts", highlight tiles, founder quote and accreditation strip. */
export const CampusHighlightsBoard = ({ data, collegeName }: { data: CampusShowcaseData; collegeName: string }) => {
  const firsts = data.firsts || [];
  const stats = data.highlight_stats || [];
  const accr = data.accreditation_logos || [];
  if (!firsts.length && !stats.length && !accr.length) return null;
  return (
    <SectionShell id="highlights" icon={<Sparkles className="w-5 h-5 text-primary" />} title={`${collegeName} at a Glance`} subtitle="Official figures from the institute's 2027 admissions brochures.">
      {firsts.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-background border border-primary/20 p-5 sm:p-6 mb-6">
          <div className="text-center mb-5">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-primary">The School of Firsts</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {firsts.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 rounded-xl bg-background/90 border border-border/60 px-3 py-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                <Laurel />
                <div className="flex-1 text-center min-w-0">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{f.lead}</div>
                  <div className="font-heading text-2xl font-extrabold text-primary leading-tight">{f.big} <span className="text-base text-foreground">{f.noun}</span></div>
                  <p className="text-sm text-foreground/80 leading-snug mt-1">{f.text}</p>
                </div>
                <Laurel flip />
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 overflow-hidden rounded-2xl border border-border/60 mb-6">
          {stats.map((s, i) => {
            const filled = (Math.floor(i / 4) + i) % 2 === 1;
            return (
              <div key={s.label} className={`p-4 sm:p-5 text-center border-border/40 ${filled ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                <div className={`font-heading text-3xl font-extrabold leading-none ${filled ? "" : "text-primary"}`}>{s.value}</div>
                <div className={`text-sm mt-2 leading-snug ${filled ? "text-primary-foreground/90" : "text-muted-foreground"}`}>{s.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {data.founder && (
        <figure className="relative rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/60 to-background p-5 sm:p-6 mb-6">
          <blockquote className="font-editorial italic text-base sm:text-xl text-foreground leading-relaxed">“{data.founder.quote}”</blockquote>
          <figcaption className="mt-3 text-sm">
            <span className="font-bold text-foreground">{data.founder.name}</span>
            {data.founder.title && <span className="text-muted-foreground"> · {data.founder.title}</span>}
          </figcaption>
        </figure>
      )}

      {accr.length > 0 && (
        <div>
          <h3 className="font-heading font-bold text-foreground mb-2 flex items-center gap-2"><Award className="w-4 h-4 text-emerald-600" /> Accreditations & Approvals</h3>
          <LogoMarquee items={accr} speed={28} tile="w-48 h-28" />
        </div>
      )}
    </SectionShell>
  );
};

/** Programme cards grouped by type (Full Time, Executive, Doctoral, Online...). */
export const ProgrammeCatalogue = ({ data, collegeName }: { data: CampusShowcaseData; collegeName: string }) => {
  const groups = data.programme_groups || [];
  if (!groups.length) return null;
  const total = groups.reduce((n, g) => n + g.programmes.length, 0);
  // Groups with several programmes get full rows; single-programme groups sit side by side.
  const multi = groups.filter((g) => g.programmes.length > 1);
  const single = groups.filter((g) => g.programmes.length === 1);
  return (
    <SectionShell icon={<GraduationCap className="w-5 h-5 text-primary" />} title={`Programmes at ${collegeName}`} subtitle={`${total} programme${total === 1 ? "" : "s"}${groups.length > 1 ? ` across ${groups.length} learning formats` : ""}. Deadlines are from the official admissions page.`}>
      <div className="space-y-6">
        {[...multi.map((g) => [g]), ...(single.length ? [single] : [])].map((row, ri) => (
          <div key={ri} className={row.length > 1 || row[0].programmes.length === 1 ? "grid gap-x-3 gap-y-6 md:grid-cols-2" : ""}>
        {row.map((g) => (
          <div key={g.group} className="flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{g.group}</span>
              <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
            </div>
            <div className={`grid gap-3 flex-1 ${g.programmes.length > 1 ? "md:grid-cols-2" : ""}`}>
              {g.programmes.map((p) => {
                const left = p.deadline ? daysLeftIst(p.deadline) : null;
                return (
                  <article key={p.code} className="group relative flex h-full flex-col rounded-2xl border border-border/60 bg-gradient-to-br from-background to-primary/5 p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-heading text-2xl font-extrabold text-foreground leading-tight">{p.code}</h3>
                        {p.name && <div className="text-sm font-semibold text-primary mt-0.5">{p.name}</div>}
                      </div>
                      {p.badge && <Badge variant="secondary" className="shrink-0 text-xs">{p.badge}</Badge>}
                    </div>
                    {p.summary && <p className="text-base text-muted-foreground mt-2 leading-snug">{p.summary}</p>}
                    {(p.duration || p.fees) && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {p.duration && <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold text-foreground"><CalendarClock className="w-3.5 h-3.5 text-primary" /> {p.duration}</span>}
                        {p.fees && <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold text-foreground"><IndianRupee className="w-3.5 h-3.5 text-primary" /> {p.fees}</span>}
                      </div>
                    )}
                    {p.deadline && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200/70 bg-amber-50/70 px-3 py-2">
                        <span className="text-sm text-foreground">Application deadline: <strong>{formatDeadline(p.deadline)}</strong></span>
                        {left !== null && left >= 0 && (
                          <span className="ml-auto rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold text-amber-950">{left === 0 ? "Closes today" : `${left} day${left === 1 ? "" : "s"} left`}</span>
                        )}
                        {left !== null && left < 0 && <span className="ml-auto text-xs font-semibold text-muted-foreground">Closed for this round</span>}
                      </div>
                    )}
                    <div className="mt-auto pt-4 flex flex-wrap gap-2">
                      {p.learn_url && (
                        <a href={p.learn_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="gap-1.5 font-bold">Learn more <ExternalLink className="w-3.5 h-3.5" /></Button>
                        </a>
                      )}
                      {p.apply_url && (
                        <a href={p.apply_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="gap-1.5 font-bold">Apply now <ExternalLink className="w-3.5 h-3.5" /></Button>
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ))}
          </div>
        ))}
      </div>
    </SectionShell>
  );
};

/** Programme-wise deep dive: batch profile, term-wise curriculum, specializations, fees and eligibility. */
export const ProgrammeDeepDive = ({ data, onDownload }: { data: CampusShowcaseData; onDownload?: (url: string, filename: string, source?: "downloads" | "programme_deep_dive" | "placement_report") => void }) => {
  const list = data.programme_details || [];
  const [active, setActive] = useState(list[0]?.code || "");
  const [term, setTerm] = useState(0);
  const [view, setView] = useState<"curriculum" | "batch" | "specializations" | "fees">("curriculum");
  const p = list.find((x) => x.code === active) || list[0];
  if (!p) return null;
  const views = [
    ...(p.terms?.length ? [{ value: "curriculum" as const, label: "Term-wise curriculum" }] : []),
    ...(p.batch_stats?.length || p.work_ex?.length ? [{ value: "batch" as const, label: "Batch profile" }] : []),
    ...(p.specializations?.length ? [{ value: "specializations" as const, label: "Specializations" }] : []),
    ...(p.fees?.rows.length || p.eligibility?.length ? [{ value: "fees" as const, label: "Fees & eligibility" }] : []),
  ];
  const currentView = views.some((v) => v.value === view) ? view : views[0]?.value;
  const t = p.terms?.[Math.min(term, (p.terms?.length || 1) - 1)];
  const specGroups = Array.from(new Set((p.specializations || []).map((s) => s.group || "")));

  return (
    <SectionShell icon={<BookOpen className="w-5 h-5 text-primary" />} title="Programme Deep Dive" subtitle="Pick a programme to see its terms, class profile, specializations and fee structure.">
      {list.length > 1 && (
        <div className="mb-4">
          <Pills label="Programme" options={list.map((x) => ({ value: x.code, label: x.code }))} value={p.code} onChange={(v) => { setActive(v); setTerm(0); }} />
        </div>
      )}
      <div className="rounded-2xl bg-gradient-to-br from-primary/12 via-primary/5 to-background border border-primary/20 p-5 mb-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{p.code}{p.duration ? ` · ${p.duration}` : ""}</div>
          <h3 className="font-heading text-2xl font-extrabold text-foreground leading-tight mt-1">{p.name}</h3>
          {p.tagline && <p className="text-base text-muted-foreground mt-1">{p.tagline}</p>}
        </div>
        {p.brochure_url && (
          <Button className="gap-2 font-bold shrink-0" onClick={() => onDownload?.(p.brochure_url!, `${p.code.toLowerCase()}-brochure.pdf`, "programme_deep_dive")}>
            <FileDown className="w-4 h-4" /> {p.code} brochure (PDF)
          </Button>
        )}
      </div>

      {views.length > 1 && (
        <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-border mb-5" role="tablist" aria-label={`${p.code} details`}>
          {views.map((v) => (
            <button key={v.value} type="button" role="tab" aria-selected={currentView === v.value} onClick={() => setView(v.value)}
              className={`shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${currentView === v.value ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {v.label}
            </button>
          ))}
        </div>
      )}

      {currentView === "curriculum" && t && (
        <div>
          {p.curriculum_note && <p className="text-sm text-muted-foreground mb-4">{p.curriculum_note}</p>}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-4" role="tablist" aria-label="Terms">
            {p.terms!.map((x, i) => (
              <button key={x.term} type="button" role="tab" aria-selected={t.term === x.term} onClick={() => setTerm(i)}
                className={`shrink-0 rounded-xl border px-4 py-2 text-left transition-all ${t.term === x.term ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-background border-border hover:border-primary/40"}`}>
                <div className="text-xs font-bold uppercase tracking-wider opacity-80">{x.term}</div>
                <div className="text-sm font-semibold">{x.courses.length} course{x.courses.length === 1 ? "" : "s"}</div>
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {t.courses.map((c, i) => (
              <div key={c + i} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background px-3.5 py-3">
                <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-heading font-bold text-sm flex items-center justify-center shrink-0">{i + 1}</span>
                <span className="text-sm font-medium text-foreground">{c}</span>
              </div>
            ))}
          </div>
          {p.labs && p.labs.length > 0 && (
            <div className="mt-5 rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-4">
              <h4 className="font-heading font-bold text-foreground mb-2 flex items-center gap-2"><Leaf className="w-4 h-4 text-emerald-600" /> Experiential learning labs & clinics</h4>
              <div className="flex flex-wrap gap-2">
                {p.labs.map((l) => <span key={l} className="rounded-full border border-emerald-200 bg-background px-3 py-1 text-sm text-foreground">{l}</span>)}
              </div>
            </div>
          )}
        </div>
      )}

      {currentView === "batch" && (
        <div className="space-y-5">
          {p.batch_label && <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{p.batch_label}</div>}
          {p.batch_stats && p.batch_stats.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {p.batch_stats.map((s) => (
                <div key={s.label} className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 to-background p-4 text-center">
                  <div className="font-heading text-3xl font-extrabold text-primary leading-none">{s.value}</div>
                  <div className="text-sm text-muted-foreground mt-2">{s.label}</div>
                </div>
              ))}
            </div>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            {p.work_ex && p.work_ex.length > 0 && (
              <div className="rounded-2xl border border-border/60 p-4">
                <h4 className="font-heading font-bold text-foreground mb-3 flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary" /> Work experience</h4>
                <Bars items={p.work_ex} />
              </div>
            )}
            {p.background && p.background.length > 0 && (
              <div className="rounded-2xl border border-border/60 p-4">
                <h4 className="font-heading font-bold text-foreground mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-emerald-600" /> {p.background_title || "Academic background"}</h4>
                <Bars items={p.background} tone="emerald" />
              </div>
            )}
          </div>
        </div>
      )}

      {currentView === "specializations" && (
        <div className="space-y-5">
          {specGroups.map((g) => (
            <div key={g || "all"}>
              {g && <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2">{g}</div>}
              <div className="grid gap-3 md:grid-cols-2">
                {(p.specializations || []).filter((s) => (s.group || "") === g).map((s) => (
                  <details key={s.name} className="group rounded-2xl border border-border/60 bg-background open:shadow-md open:border-primary/30 transition-all">
                    <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-4 py-3">
                      <span className="font-heading font-bold text-foreground">{s.name}</span>
                      <span className="text-xs font-semibold text-muted-foreground">{s.courses.length} courses</span>
                    </summary>
                    <ul className="px-4 pb-4 space-y-1.5">
                      {s.courses.map((c) => <li key={c} className="flex items-start gap-2 text-sm text-foreground"><CheckCircle className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> {c}</li>)}
                    </ul>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {currentView === "fees" && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {p.fees && p.fees.rows.length > 0 && (
            <div className="rounded-2xl border border-border/60 overflow-hidden">
              <div className="bg-primary/10 px-4 py-3 font-heading font-bold text-foreground">{p.fees.title || "Fee structure"}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[360px]">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="text-left py-2.5 px-4 font-semibold text-foreground">Component</th>
                      <th className="text-right py-2.5 px-4 font-semibold text-foreground">Indian (INR)</th>
                      {p.fees.rows.some((r) => r.usd) && <th className="text-right py-2.5 px-4 font-semibold text-foreground">International (USD)</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {p.fees.rows.map((r) => (
                      <tr key={r.label} className="border-t border-border/60">
                        <td className="py-2.5 px-4 text-foreground">{r.label}</td>
                        <td className="py-2.5 px-4 text-right font-semibold text-foreground whitespace-nowrap">{r.inr}</td>
                        {p.fees!.rows.some((x) => x.usd) && <td className="py-2.5 px-4 text-right text-muted-foreground whitespace-nowrap">{r.usd}</td>}
                      </tr>
                    ))}
                    {p.fees.total && (
                      <tr className="border-t-2 border-primary/30 bg-primary/5">
                        <td className="py-3 px-4 font-heading font-bold text-foreground">Total fees</td>
                        <td className="py-3 px-4 text-right font-heading font-extrabold text-primary whitespace-nowrap">{p.fees.total.inr}</td>
                        {p.fees.rows.some((x) => x.usd) && <td className="py-3 px-4 text-right font-bold text-foreground whitespace-nowrap">{p.fees.total.usd}</td>}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {p.fees.notes && p.fees.notes.length > 0 && (
                <ul className="px-4 py-3 border-t border-border/60 space-y-1 bg-muted/20">
                  {p.fees.notes.map((n) => <li key={n} className="text-sm text-muted-foreground">• {n}</li>)}
                </ul>
              )}
            </div>
          )}
          {p.eligibility && p.eligibility.length > 0 && (
            <div className="rounded-2xl border border-border/60 p-4 space-y-3 h-fit">
              <h4 className="font-heading font-bold text-foreground flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600" /> Eligibility</h4>
              {p.eligibility.map((e) => (
                <div key={e.label} className="rounded-xl bg-muted/40 px-3.5 py-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{e.label}</div>
                  <div className="text-sm font-medium text-foreground mt-0.5">{e.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </SectionShell>
  );
};

/** Programme-wise placement report cards with function split, roles, recruiters and report download. */
export const PlacementReportsShowcase = ({ data, onDownload }: { data: CampusShowcaseData; onDownload?: (url: string, filename: string, source?: "downloads" | "programme_deep_dive" | "placement_report") => void }) => {
  const reports = data.placement_reports || [];
  const [active, setActive] = useState(reports[0]?.code || "");
  const r = reports.find((x) => x.code === active) || reports[0];
  const logos = data.recruiter_logos || [];
  const half = Math.ceil(logos.length / 2);
  const rows = useMemo(() => [logos.slice(0, half), logos.slice(half)].filter((x) => x.length), [logos, half]);
  if (!r && !logos.length) return null;
  return (
    <div className="space-y-6 mb-6">
      {r && (
        <div>
          {reports.length > 1 && (
            <div className="mb-4"><Pills label="Placement report" options={reports.map((x) => ({ value: x.code, label: `${x.code}${x.batch ? ` ${x.batch}` : ""}` }))} value={r.code} onChange={setActive} /></div>
          )}
          <div className="rounded-2xl overflow-hidden border border-emerald-200/60 bg-gradient-to-br from-emerald-50/70 via-background to-primary/5">
            <div className="px-5 pt-5">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Official placement report</div>
              <h3 className="font-heading text-2xl font-extrabold text-foreground mt-1">{r.title}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5">
              {[
                { label: "Highest domestic CTC", value: r.highest, icon: Trophy, tone: "text-amber-600" },
                { label: "Average CTC, top 10%", value: r.top10, icon: Award, tone: "text-primary" },
                { label: "Average CTC", value: r.average, icon: Sparkles, tone: "text-emerald-600" },
              ].filter((s) => s.value).map((s) => (
                <div key={s.label} className="rounded-2xl bg-background border border-border/60 p-4 shadow-sm">
                  <s.icon className={`w-5 h-5 ${s.tone} mb-2`} />
                  <div className="font-heading text-3xl font-extrabold text-foreground leading-none">{s.value}</div>
                  <div className="text-sm text-muted-foreground mt-2">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="grid gap-5 px-5 pb-5 lg:grid-cols-2">
              {r.functions && r.functions.length > 0 && (
                <div className="rounded-2xl bg-background border border-border/60 p-4">
                  <h4 className="font-heading font-bold text-foreground mb-3">Function-wise roles offered</h4>
                  <Bars items={r.functions} tone="emerald" />
                </div>
              )}
              <div className="space-y-4">
                {r.profiles && r.profiles.length > 0 && (
                  <div className="rounded-2xl bg-background border border-border/60 p-4">
                    <h4 className="font-heading font-bold text-foreground mb-3">Profiles offered</h4>
                    <div className="flex flex-wrap gap-2">{r.profiles.map((x) => <span key={x} className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-foreground">{x}</span>)}</div>
                  </div>
                )}
                {r.recruiters && r.recruiters.length > 0 && (
                  <div className="rounded-2xl bg-background border border-border/60 p-4">
                    <h4 className="font-heading font-bold text-foreground mb-3">Recruiters this season</h4>
                    <div className="flex flex-wrap gap-1.5">{r.recruiters.map((x) => <Badge key={x} variant="outline" className="text-xs py-1 px-2.5">{x}</Badge>)}</div>
                  </div>
                )}
              </div>
            </div>
            {(r.report_url || r.learn_url) && (
              <div className="flex flex-wrap gap-2 border-t border-border/60 px-5 py-4 bg-background/60">
                {r.report_url && (
                  <Button className="gap-2 font-bold" onClick={() => onDownload?.(r.report_url!, `${r.code.toLowerCase()}-placement-report.pdf`, "placement_report")}>
                    <FileDown className="w-4 h-4" /> Download {r.code} report (PDF)
                  </Button>
                )}
                {r.learn_url && (
                  <a href={r.learn_url} target="_blank" rel="noopener noreferrer"><Button variant="outline" className="gap-2 font-bold">Official placement page <ExternalLink className="w-4 h-4" /></Button></a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {logos.length > 0 && (
        <div>
          <h3 className="font-heading font-bold text-foreground mb-1">Marquee recruiters across industries and functions</h3>
          <p className="text-sm text-muted-foreground mb-2">A selection of companies that hire from the campus.</p>
          <div className="space-y-1">
            {rows.map((row, i) => <LogoMarquee key={i} items={row} speed={30 + i * 6} reverse={i % 2 === 1} />)}
          </div>
        </div>
      )}
    </div>
  );
};

/** Big-number ranking showcase (replaces plain rank chips when present). */
export const RankingSpotlight = ({ data }: { data: CampusShowcaseData }) => {
  const items = data.rank_spotlight || [];
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {items.map((r, i) => (
        <div key={i} className="relative rounded-2xl border border-border/60 bg-gradient-to-b from-muted/40 to-background p-4 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all">
          <div className="flex items-start justify-center gap-0.5">
            <span className="font-heading text-6xl font-extrabold text-foreground leading-none tracking-tight">{r.rank}</span>
            {r.suffix && <span className="font-heading text-base font-bold text-primary mt-1">{r.suffix}</span>}
          </div>
          <div className="mt-2 text-sm font-extrabold uppercase tracking-wider text-primary">{r.body}</div>
          <div className="text-sm text-foreground/80 leading-snug mt-1">{r.label}</div>
          {r.year && <div className="text-xs text-muted-foreground mt-1">{r.year}</div>}
        </div>
      ))}
    </div>
  );
};

/** Karma-Yoga social impact numbers. */
export const KarmaYogaImpact = ({ data }: { data: CampusShowcaseData }) => {
  const items = data.karma_yoga || [];
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/70 to-background p-5 mb-6">
      <h3 className="font-heading font-bold text-foreground flex items-center gap-2"><Leaf className="w-4 h-4 text-emerald-600" /> Karma-Yoga impact</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">The rural leadership lab every student joins, working on education, health, agriculture and small business.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((s) => (
          <div key={s.label} className="rounded-xl bg-background border border-border/60 p-3 text-center">
            <div className="font-heading text-3xl font-extrabold text-emerald-700 leading-none">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-2 leading-snug">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Download centre for official brochures and placement reports. */
export const BrochureDownloads = ({ data, onDownload }: { data: CampusShowcaseData; onDownload?: (url: string, filename: string, source?: "downloads" | "programme_deep_dive" | "placement_report") => void }) => {
  const items = data.brochures || [];
  if (!items.length) return null;
  return (
    <SectionShell icon={<FileDown className="w-5 h-5 text-primary" />} title="Download Brochures & Placement Reports" subtitle="Official PDFs with fees, curriculum, class profile and the latest placement report.">
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((b) => (
          <div key={b.url} className="flex items-start gap-4 rounded-2xl border border-border/60 bg-gradient-to-br from-background to-primary/5 p-4 hover:shadow-md hover:border-primary/40 transition-all">
            <div className="w-12 h-14 rounded-lg bg-primary/10 border border-primary/20 flex flex-col items-center justify-center shrink-0">
              <FileDown className="w-5 h-5 text-primary" />
              <span className="text-xs font-bold text-primary mt-0.5">PDF</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-heading font-bold text-foreground leading-snug">{b.title}</h3>
              {b.description && <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{b.description}</p>}
              <div className="mt-3 flex items-center gap-3">
                <Button size="sm" className="gap-1.5 font-bold" onClick={() => onDownload?.(b.url, b.filename || "brochure.pdf", "downloads")}>
                  <FileDown className="w-3.5 h-3.5" /> Download
                </Button>
                {b.size_label && <span className="text-xs text-muted-foreground">{b.size_label}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
};
