import { useEffect, useState } from "react";
import { Mail } from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");

/** 24-hour countdown until the predicted percentile email arrives. */
const PercentileCountdown = ({ startedAt }: { startedAt: string }) => {
  const target = new Date(startedAt).getTime() + 24 * 60 * 60 * 1000;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, target - now);
  const h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000), s = Math.floor((left % 60000) / 1000);
  const progress = 100 - (left / (24 * 3600000)) * 100;

  return (
    <section className="max-w-5xl mx-auto px-4 pt-4">
      <div className="rounded-xl border border-primary/20 bg-card/90 backdrop-blur-sm px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Mail className="h-4 w-4 text-primary" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Your predicted percentile is on its way!</p>
              <p className="text-sm text-muted-foreground">India's Most Advanced & Accurate Percentile Prediction, delivered to your email within 24 hours.</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-center" aria-live="polite">
            {[["h", h], ["m", m], ["s", s]].map(([label, v], i) => (
              <div key={label as string} className="flex items-center gap-1.5">
                <span className="rounded-md bg-primary/10 px-2 py-1 font-mono text-base font-bold tabular-nums text-primary">
                  {pad(v as number)}<span className="text-sm font-medium text-primary/70">{label}</span>
                </span>
                {i < 2 && <span className="text-primary/40">:</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-primary/10">
          <div className="h-full rounded-full bg-primary transition-all duration-1000" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Stay tuned. Your CAT percentile prediction is coming soon!</p>
      </div>
    </section>
  );
};

export default PercentileCountdown;
