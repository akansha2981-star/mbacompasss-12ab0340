import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props<T> {
  items: T[];
  render: (item: T, index: number) => ReactNode;
  label?: string;
  variant?: "default" | "gallery";
}

/** One visible-only timer; original items remain scrollable without JS or motion. */
export default function CollegeAutoSlider<T>({ items, render, label = "College highlights", variant = "default" }: Props<T>) {
  const track = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    const visibility = () => setPageVisible(!document.hidden);
    update();
    visibility();
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", visibility);
    const element = track.current;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    if (element) observer.observe(element);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  const advance = useCallback((direction: number, automatic = false) => {
    const element = track.current;
    if (!element) return;
    const width = (element.firstElementChild?.getBoundingClientRect().width || 280) + 16;
    const end = element.scrollWidth - element.clientWidth;
    const next = automatic && element.scrollLeft >= end - 8 ? 0 : element.scrollLeft + direction * width;
    element.scrollTo({ left: next, behavior: reducedMotion ? "instant" : "smooth" });
  }, [reducedMotion]);

  useEffect(() => {
    if (!visible || paused || interacting || reducedMotion || !pageVisible || items.length < 2) return;
    const timer = window.setInterval(() => advance(1, true), 5500);
    return () => window.clearInterval(timer);
  }, [visible, paused, interacting, reducedMotion, pageVisible, items.length, advance]);

  if (!items.length) return null;

  return (
    <div className={`college-slider min-w-0 ${variant === "gallery" ? "college-gallery-slider" : ""}`} role="region" aria-label={label} aria-roledescription="carousel"
      onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{items.length} {label.toLowerCase()}</span>
        {items.length > 1 && <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" aria-label={`Previous ${label.toLowerCase()}`} title="Previous" onClick={() => { setPaused(true); advance(-1); }}><ArrowLeft /></Button>
          {!reducedMotion && <Button variant="ghost" size="icon" aria-label={paused ? `Play ${label.toLowerCase()}` : `Pause ${label.toLowerCase()}`} title={paused ? "Play" : "Pause"} onClick={() => setPaused(!paused)}>{paused ? <Play /> : <Pause />}</Button>}
          <Button variant="outline" size="icon" aria-label={`Next ${label.toLowerCase()}`} title="Next" onClick={() => { setPaused(true); advance(1); }}><ArrowRight /></Button>
        </div>}
      </div>
      <div ref={track} className="college-slider-track flex gap-4 overflow-x-auto pb-3" tabIndex={0} aria-label={`${label} items`}
        onTouchStart={() => setPaused(true)} onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); setPaused(true); advance(event.key === "ArrowRight" ? 1 : -1); }
        }}>
        {items.map((item, index) => <div key={index} className="college-slide min-w-0 shrink-0">{render(item, index)}</div>)}
      </div>
    </div>
  );
}