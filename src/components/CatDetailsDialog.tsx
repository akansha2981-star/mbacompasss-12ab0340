import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";

export interface CatContact { name: string; email: string; phone: string }

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  name: string;
  defaultEmail?: string;
  defaultPhone?: string;
  onSubmit: (c: CatContact) => Promise<void>;
}

const CatDetailsDialog = ({ open, onOpenChange, name, defaultEmail = "", defaultPhone = "", onSubmit }: Props) => {
  const [fullName, setFullName] = useState(name);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!open) return;
    setFullName(name); setEmail(defaultEmail);
    setPhone(defaultPhone.replace(/\D/g, "").slice(-10)); setOtp(""); setOtpSent(false);
  }, [open, name, defaultEmail, defaultPhone]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const phoneOk = /^[6-9]\d{9}$/.test(phone);

  const sendOtp = async () => {
    if (!emailOk) { toast.error("Enter a valid email address."); return; }
    if (!phoneOk) { toast.error("Enter a valid 10-digit mobile number."); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", { body: { phone } });
      if (error || data?.error) throw new Error(data?.error || "Could not send OTP. Please try again.");
      setOtpSent(true); setCooldown(30);
      toast.success(`OTP sent to ${phone}`);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const verifyAndSubmit = async () => {
    if (otp.length !== 6) { toast.error("Enter the 6-digit OTP."); return; }
    if (!fullName.trim()) { toast.error("Enter your name."); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", { body: { phone, otp } });
      if (error || data?.error || !data?.verified) throw new Error(data?.error || "Incorrect OTP. Please try again.");
      await onSubmit({ name: fullName.trim(), email: email.trim(), phone });
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Where should we send your percentile?</DialogTitle>
          <DialogDescription>
            Your predicted percentile will be sent to the email and mobile number below. Kindly enter accurate details.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="cat-name">Name (from your response sheet)</Label>
            <Input id="cat-name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={255} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cat-email">Email</Label>
            <Input id="cat-email" type="email" value={email} disabled={otpSent} maxLength={255}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cat-phone">Mobile number</Label>
            <Input id="cat-phone" inputMode="numeric" value={phone} disabled={otpSent} maxLength={10}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile number" />
          </div>
          {!otpSent ? (
            <Button className="w-full" onClick={sendOtp} disabled={busy}>{busy ? "Sending OTP..." : "Send OTP"}</Button>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Enter the OTP sent to {phone}.</p>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
                </InputOTP>
              </div>
              <Button className="w-full" onClick={verifyAndSubmit} disabled={busy}>{busy ? "Verifying..." : "Verify & View My Score"}</Button>
              <div className="flex justify-between text-sm">
                <button className="text-muted-foreground underline" onClick={() => setOtpSent(false)}>Edit details</button>
                <button className="text-primary disabled:text-muted-foreground" disabled={cooldown > 0 || busy} onClick={sendOtp}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CatDetailsDialog;
