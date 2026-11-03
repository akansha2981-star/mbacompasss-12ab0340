import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { trackCatEvent } from "@/lib/catSettings";

/** Email/WhatsApp alerts for response sheet, answer key and result. */
export default function CatAlertSignup({ compact = false, exam = "CAT 2026" }: { compact?: boolean; exam?: string }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    const ph = phone.replace(/\D/g, "").slice(-10);
    if (!em && !ph) return toast.error("Enter an email or WhatsApp number.");
    if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return toast.error("Enter a valid email.");
    if (ph && !/^[6-9]\d{9}$/.test(ph)) return toast.error("Enter a valid 10-digit WhatsApp number.");
    if (!consent) return toast.error("Please tick the consent box.");
    setBusy(true);
    const { error } = await supabase.from("cat_alert_signups").insert({
      email: em || null, whatsapp: ph || null, consent: true,
      source_path: typeof window !== "undefined" ? window.location.pathname : null,
    });
    setBusy(false);
    if (error) return toast.error("Could not save. Please try again.");
    trackCatEvent("alert_signup", { channel: em && ph ? "both" : em ? "email" : "whatsapp" });
    setDone(true);
  };

  if (done) return <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">You're on the list. We'll alert you when response sheets, answer keys and results are out.</div>;

  return (
    <form onSubmit={submit} className={`rounded-xl border border-border bg-card p-4 shadow-sm ${compact ? "" : "md:p-5"}`}>
      <p className="flex items-center gap-2 text-base font-semibold text-foreground"><BellRing className="h-4 w-4 text-primary" /> Get {exam} alerts</p>
      <p className="mt-1 text-sm text-muted-foreground">{exam.startsWith("CAT") ? "Response sheet release, slot-wise answer keys and result day. No spam." : "Response sheet release, answer key and result day. No spam."}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="sr-only" htmlFor="cat-alert-email">Email</label>
        <input id="cat-alert-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" maxLength={255}
          className="rounded-lg border border-border bg-background px-3 py-2.5 text-base text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20" />
        <label className="sr-only" htmlFor="cat-alert-phone">WhatsApp number</label>
        <input id="cat-alert-phone" type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="WhatsApp number (10 digits)" maxLength={14}
          className="rounded-lg border border-border bg-background px-3 py-2.5 text-base text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20" />
      </div>
      <label className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
        <span>I agree to receive {exam} updates from MBA Compass by email/WhatsApp. I can opt out anytime. See our <Link to="/privacy-policy" className="text-primary underline">privacy policy</Link>.</span>
      </label>
      <Button type="submit" disabled={busy} className="mt-3 w-full sm:w-auto">{busy ? "Saving..." : "Notify me"}</Button>
    </form>
  );
}
