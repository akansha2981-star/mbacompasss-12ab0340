import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPhone?: string;
  onVerified: (phone: string) => void;
}

/** Standalone mobile OTP verification used by tools that require a verified number. */
const PhoneOtpVerifyDialog = ({ open, onOpenChange, initialPhone = "", onVerified }: Props) => {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (open) {
      setPhone(initialPhone.replace(/\D/g, "").slice(-10));
      setOtp("");
      setStep("phone");
    }
  }, [open, initialPhone]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) { toast.error("Enter a valid 10-digit mobile number."); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", { body: { phone } });
      if (error || data?.error) throw new Error(data?.error || "Could not send OTP. Please try again.");
      setStep("otp");
      setCooldown(30);
      toast.success(`OTP sent to ${phone}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  const verify = async () => {
    if (otp.length !== 6) { toast.error("Enter the 6-digit OTP."); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", { body: { phone, otp } });
      if (error || data?.error || !data?.verified) throw new Error(data?.error || "Incorrect OTP. Please try again.");
      toast.success("Mobile number verified");
      onVerified(phone);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Verify your mobile number</DialogTitle>
          <DialogDescription>We need a verified mobile number before calculating your score.</DialogDescription>
        </DialogHeader>
        {step === "phone" ? (
          <div className="space-y-3">
            <Input inputMode="numeric" maxLength={10} placeholder="10-digit mobile number" value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} />
            <Button className="w-full" onClick={send} disabled={busy}>{busy ? "Sending..." : "Send OTP"}</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Enter the OTP sent to {phone}.</p>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button className="w-full" onClick={verify} disabled={busy}>{busy ? "Verifying..." : "Verify & Calculate"}</Button>
            <div className="flex justify-between text-sm">
              <button className="text-muted-foreground underline" onClick={() => setStep("phone")}>Change number</button>
              <button className="text-primary disabled:text-muted-foreground" disabled={cooldown > 0 || busy} onClick={send}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PhoneOtpVerifyDialog;
