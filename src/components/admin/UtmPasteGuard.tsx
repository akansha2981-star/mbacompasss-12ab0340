import { useEffect, useRef, useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { needsUtmPrompt } from "@/lib/utmEngine";
import { createUtmLink } from "@/lib/utm.functions";

const trackingOrigin = () =>
  /mbacompass\.in$/.test(window.location.hostname) ? "https://mbacompass.in" : window.location.origin;

type Pending = { url: string; target: HTMLElement; range: Range | null; selStart: number | null; selEnd: number | null };

/**
 * Admin-wide: when an external URL is pasted into any field or editor, ask before
 * pasting whether to convert it into a tracking (UTM) link. Already-tracked links paste normally.
 */
export default function UtmPasteGuard() {
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bypass = useRef(false);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (bypass.current) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const isField = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
      const editable = isField || target.isContentEditable || !!target.closest?.("[contenteditable='true']");
      if (!editable) return;
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (!needsUtmPrompt(text)) return;
      e.preventDefault();
      e.stopPropagation();
      const sel = window.getSelection();
      setError(null);
      setPending({
        url: text.trim(),
        target,
        range: !isField && sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null,
        selStart: isField ? (target as HTMLInputElement).selectionStart : null,
        selEnd: isField ? (target as HTMLInputElement).selectionEnd : null,
      });
    };
    document.addEventListener("paste", onPaste, true);
    return () => document.removeEventListener("paste", onPaste, true);
  }, []);

  const insert = (p: Pending, text: string) => {
    p.target.focus();
    if (p.target instanceof HTMLInputElement || p.target instanceof HTMLTextAreaElement) {
      if (p.selStart != null) p.target.setSelectionRange(p.selStart, p.selEnd ?? p.selStart);
    } else if (p.range) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(p.range);
    }
    bypass.current = true;
    const ok = document.execCommand("insertText", false, text);
    bypass.current = false;
    if (!ok && (p.target instanceof HTMLInputElement || p.target instanceof HTMLTextAreaElement)) {
      const el = p.target;
      const s = p.selStart ?? el.value.length;
      const next = el.value.slice(0, s) + text + el.value.slice(p.selEnd ?? s);
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
      setter?.call(el, next);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  const pasteAsIs = () => {
    if (!pending) return;
    const p = pending;
    setPending(null);
    setTimeout(() => insert(p, p.url), 0);
  };

  const convert = async () => {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const res = await createUtmLink({ data: { destination: pending.url, medium: "admin_paste" } });
      const p = pending;
      setPending(null);
      setTimeout(() => insert(p, `${trackingOrigin()}/go/${res.code}`), 0);
    } catch (err: any) {
      setError(err?.message || "Could not create the tracking link.");
    } finally {
      setBusy(false);
    }
  };

  if (!pending) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/30 p-4" role="dialog" aria-modal="true" aria-label="Convert link to UTM">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
        <div className="flex items-center gap-2 font-semibold">
          <Link2 className="h-5 w-5 text-primary" /> Convert this link to a UTM link?
        </div>
        <p className="mt-2 break-all rounded-md bg-muted p-2 text-sm text-muted-foreground">{pending.url}</p>
        <p className="mt-2 text-sm text-muted-foreground">Converted links are tracked in Admin → UTM Tracking.</p>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => setPending(null)} disabled={busy}>Cancel</Button>
          <Button variant="outline" onClick={pasteAsIs} disabled={busy}>Paste as is</Button>
          <Button onClick={convert} disabled={busy}>
            {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Convert to UTM
          </Button>
        </div>
      </div>
    </div>
  );
}
