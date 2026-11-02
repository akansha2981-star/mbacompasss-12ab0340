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
    <section className="max-w-5xl mx-auto px-4 pt-8">
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-primary/10 p-6 md:p-10 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">India's Most Advanced & Accurate Percentile Prediction</p>
        <h2 className="mt-3 text-2xl md:text-4xl font-bold text-foreground">Your predicted percentile is on its way!</h2>
        <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">
          Get India's most accurate and advanced percentile prediction delivered straight to your email within the next 24 hours.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3 md:gap-5" aria-live="polite">
          {[["Hours", h], ["Minutes", m], ["Seconds", s]].map(([label, v], i) => (
            <div key={label as string} className="flex items-center gap-3 md:gap-5">
              <div className="min-w-20 md:min-w-28 rounded-xl border border-primary/15 bg-card px-3 py-4 shadow-sm">
                <p className="text-4xl font-bold tabular-nums text-primary">{pad(v as number)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{label}</p>
              </div>
              {i < 2 && <span className="text-4xl font-bold text-primary/40">:</span>}
            </div>
          ))}
        </div>
        <div className="mx-auto mt-6 h-1.5 max-w-md overflow-hidden rounded-full bg-primary/10">
          <div className="h-full rounded-full bg-primary transition-all duration-1000" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-5 inline-flex items-center gap-2 text-base font-medium text-foreground">
          <Mail className="h-4 w-4 text-primary" /> Stay tuned. Your CAT percentile prediction is coming soon!
        </p>
      </div>
    </section>
  );
};

export default PercentileCountdown;
