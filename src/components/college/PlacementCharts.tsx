import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Parse values like "7.56 LPA", "₹22.5 L", "23" into numbers.
const parseLpa = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return null;
  const m = v.replace(/[₹,\s]/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
};

const SECTOR_COLORS = ["#0ea5e9", "#f59e0b", "#10b981", "#a855f7", "#f43f5e", "#14b8a6"];

const tooltipStyle = {
  borderRadius: "0.75rem",
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
  color: "hsl(var(--foreground))",
  fontSize: "0.8rem",
  boxShadow: "0 8px 24px -8px rgb(0 0 0 / 0.15)",
} as const;

// Charts measure their container, so render only after mount to stay hydration-safe.
const useMounted = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
};

/** Year-wise placement trend: grouped bars (average/median) + line (highest CTC). */
export const PlacementTrendChart = ({ yearly }: { yearly: any[] }) => {
  const mounted = useMounted();
  const data = useMemo(
    () =>
      [...yearly]
        .reverse()
        .map((y: any) => ({
          year: String(y.year ?? ""),
          Average: parseLpa(y.average),
          Median: parseLpa(y.median),
          Highest: parseLpa(y.highest),
        }))
        .filter((d) => d.year && (d.Average != null || d.Highest != null)),
    [yearly],
  );
  if (data.length === 0) return null;
  return (
    <div className="h-64 w-full rounded-xl border border-border/60 bg-muted/20 p-3" role="img" aria-label="Year-wise placement trend chart">
      {mounted && (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 12, left: -14, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} unit=" L" />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => (value == null ? "—" : `${value} LPA`)} />
            <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
            <Bar dataKey="Average" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={34} />
            <Bar dataKey="Median" fill="#a855f7" radius={[6, 6, 0, 0]} maxBarSize={34} />
            <Line type="monotone" dataKey="Highest" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4, fill: "#f59e0b" }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

/** Sector-wise placement split as a donut with a labelled legend. */
export const SectorDonut = ({ sectors }: { sectors: { sector: string; pct: number }[] }) => {
  const mounted = useMounted();
  const data = useMemo(() => sectors.filter((s) => Number(s.pct) > 0), [sectors]);
  if (data.length === 0) return null;
  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="h-52 w-52 shrink-0" role="img" aria-label="Sector-wise placement share chart">
        {mounted && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="pct" nameKey="sector" innerRadius={52} outerRadius={82} paddingAngle={3} strokeWidth={2} stroke="hsl(var(--card))">
                {data.map((_, i) => (
                  <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      <ul className="flex-1 w-full space-y-2.5">
        {data.map((s, i) => (
          <li key={s.sector} className="flex items-center gap-2.5 text-sm">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: SECTOR_COLORS[i % SECTOR_COLORS.length] }} aria-hidden />
            <span className="flex-1 text-foreground font-medium truncate">{s.sector}</span>
            <span className="font-heading font-bold text-foreground">{s.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
