import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useApp } from "@/lib/data";
import { TOUR } from "@/lib/tour";
import { prefersReducedMotion } from "@/format";
import { useMascot } from "./MascotProvider";

/**
 * Guided tour: dims the stage except one widget, moves Dewy beside it and shows
 * one short line. Manual mode has Back / Next (and ← →, Esc); story mode is
 * timed by lib/story.ts.
 */
export function TourLayer() {
  const { tour, setTourStep, endTour, screen } = useApp();
  const mascot = useMascot();
  const m = useRef(mascot);
  m.current = mascot;
  const [hole, setHole] = useState<DOMRect | null>(null);
  const [stage, setStage] = useState<DOMRect | null>(null);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    if (!tour) {
      setHole(null);
      m.current.placeAt(null);
      m.current.hush();
      m.current.point(null);
      return;
    }
    const step = TOUR[tour.step];
    let alive = true;
    const measure = (first = false) => {
      const el = document.querySelector(step.target);
      const main = document.querySelector("main");
      if (!alive) return;
      if (!el || !main) return setHole(null);
      const r = el.getBoundingClientRect();
      setHole(r);
      setStage(main.getBoundingClientRect());
      m.current.placeAt(r);
      if (first) {
        m.current.setMood(step.mood);
        m.current.say(step.line, { ms: 120000 });
        window.setTimeout(() => alive && m.current.point(el), 650);
      }
    };
    // wait for the slide transition (exit + enter, about 0.5 s) before measuring;
    // retry briefly in case the widget mounts late
    let tries = 0;
    let t = 0;
    const attempt = () => {
      if (!alive) return;
      if (document.querySelector(step.target) || tries++ > 10) measure(true);
      else t = window.setTimeout(attempt, 150);
    };
    t = window.setTimeout(attempt, 650);
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => {
      alive = false;
      window.clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
  }, [tour?.step, tour?.mode, screen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Manual tour keys take priority over slide keys.
  useEffect(() => {
    if (!tour || tour.mode !== "manual") return;
    const on = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") tour.step < TOUR.length - 1 ? setTourStep(tour.step + 1) : endTour();
      else if (e.key === "ArrowLeft") tour.step > 0 && setTourStep(tour.step - 1);
      else if (e.key === "Escape") endTour();
      else return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener("keydown", on, { capture: true });
    return () => window.removeEventListener("keydown", on, { capture: true });
  }, [tour, setTourStep, endTour]);

  const pad = 12;
  return (
    <AnimatePresence>
      {tour && hole && stage && (
        <motion.div key="tour" className="pointer-events-none fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.3 }}>
          {/* dim the stage only (sidebar and footer stay readable) */}
          <svg className="absolute" style={{ left: stage.left, top: stage.top, width: stage.width, height: stage.height }} aria-hidden="true">
            <defs>
              <mask id="tourHole">
                <rect width="100%" height="100%" fill="white" />
                <motion.rect
                  rx={24}
                  fill="black"
                  initial={false}
                  animate={{ x: hole.left - stage.left - pad, y: hole.top - stage.top - pad, width: hole.width + 2 * pad, height: hole.height + 2 * pad }}
                  transition={reduced ? { duration: 0 } : { type: "spring", visualDuration: 0.5, bounce: 0.1 }}
                />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(15,23,42,0.42)" mask="url(#tourHole)" />
          </svg>
          {tour.mode === "manual" && (
            <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2" style={{ top: stage.bottom - 64 }} data-story-control>
              <div className="flex items-center gap-1 rounded-full bg-white p-1.5 text-[15px] font-medium shadow-xl ring-1 ring-border">
                <span className="px-3 font-mono text-[13px] text-muted-foreground">{tour.step + 1} / {TOUR.length}</span>
                <button onClick={() => setTourStep(tour.step - 1)} disabled={tour.step === 0} className="flex items-center gap-1 rounded-full px-3 py-1.5 hover:bg-muted disabled:opacity-40">
                  <ArrowLeft className="size-4" aria-hidden="true" /> Back
                </button>
                <button onClick={() => (tour.step < TOUR.length - 1 ? setTourStep(tour.step + 1) : endTour())} className="flex items-center gap-1 rounded-full bg-foreground px-4 py-1.5 text-white hover:opacity-85">
                  {tour.step < TOUR.length - 1 ? "Next" : "Done"} <ArrowRight className="size-4" aria-hidden="true" />
                </button>
                <button onClick={endTour} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="End tour (Esc)">
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
