import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue } from "motion/react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Subtitles, X } from "lucide-react";
import { useApp, type DemoPreset, type View } from "@/lib/data";
import { useMascot } from "@/components/mascot/MascotProvider";
import type { Mood } from "@/components/mascot/Dewy";
import type { BadgeKind } from "@/components/slides/ui";

/**
 * The Demo Director: plays docs/demo/timeline.json (built by scripts/build_demo.py)
 * on the REAL app. It switches screens with go(), clicks real buttons, drags the
 * real slider through setIdx, types into the real chat input and submits it.
 * Its own clock (pause, speed, chapter jumps) keeps every run identical.
 */
interface Action {
  at: number; do: string; target?: string | null; screen?: number; view?: View; idx?: number; preset?: string;
  to?: number; dur?: number; text?: string; cps?: number; restart?: boolean; hold?: number | null;
  mood?: Mood; say?: string; badge?: BadgeKind; ms?: number; align?: string; look?: string;
}
interface Step {
  id: string; chapter: string; start: number; duration: number; narration: string; captions: string[];
  mood: Mood; spotlight: string | null; align: string | null; look: string | null; actions: Action[];
}
interface Preset { total: number; chapters: { id: string; title: string; start: number; duration: number }[]; steps: Step[] }
interface Timeline { presets: Record<DemoPreset, Preset> }

declare global {
  interface Window { __greenqDemo?: { started: number; done: boolean; total: number; preset: string } }
}

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
async function find(sel: string, tries = 20): Promise<Element | null> {
  for (let i = 0; i < tries; i++) {
    const el = document.querySelector(sel);
    if (el && (el as HTMLElement).getBoundingClientRect().width > 0) return el;
    await wait(80);
  }
  return null;
}
const center = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};
/** Small seeded random (mulberry32) so typing pauses are the same every run. */
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function Director({ preset: initial, record, captions: captionsInit }: { preset: DemoPreset; record: boolean; captions: boolean }) {
  const app = useApp();
  const mascot = useMascot();
  const A = useRef(app); A.current = app;
  const M = useRef(mascot); M.current = mascot;
  const [tl, setTl] = useState<Timeline | null>(null);
  const [presetName, setPresetName] = useState<DemoPreset>(initial);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [captionsOn, setCaptionsOn] = useState(captionsInit);
  const [stepIdx, setStepIdx] = useState(-1);
  const [shownT, setShownT] = useState(0);
  const [spot, setSpot] = useState<string | null>(null);
  const [bar, setBar] = useState(!record);
  const t = useRef(0);
  const done = useRef(new Set<string>());
  const pausedRef = useRef(false); pausedRef.current = paused;
  const speedRef = useRef(1); speedRef.current = speed;
  const finished = useRef(false);

  // virtual cursor
  const cx = useMotionValue(window.innerWidth * 0.6), cy = useMotionValue(window.innerHeight * 0.55);
  const [ripple, setRipple] = useState<{ n: number; x: number; y: number } | null>(null);
  const [cursorOn, setCursorOn] = useState(false);
  const moveCursor = useCallback(async (x: number, y: number, sec = 0.6) => {
    setCursorOn(true);
    const x0 = cx.get(), y0 = cy.get();
    const d = sec / speedRef.current;
    // a gentle curve: overshoot sideways a little, slow down near the target
    const mx = (x0 + x) / 2 + (y - y0) * 0.12, my = (y0 + y) / 2 - (x - x0) * 0.12;
    const ease = [0.33, 0, 0.2, 1] as const;
    animate(cx, [x0, mx, x], { duration: d, ease });
    await animate(cy, [y0, my, y], { duration: d, ease });
    await wait(90 / speedRef.current);
  }, [cx, cy]);
  const clickAt = useCallback((x: number, y: number) => setRipple((r) => ({ n: (r?.n ?? 0) + 1, x, y })), []);

  useEffect(() => {
    fetch("/api/demo").then((r) => (r.ok ? r.json() : null)).then(setTl).catch(() => setTl(null));
  }, []);
  const P = tl?.presets[presetName];

  /* ------------------------------------------------------------ actions */
  const run = useCallback(async (a: Action) => {
    const app = A.current, m = M.current, sp = speedRef.current;
    switch (a.do) {
      case "reset":
        app.endTour();
        app.go(0);
        app.setIdx(10); app.setView("before"); app.setPreset("flexible");
        app.setHeroHold(null);
        setSpot(null);
        m.hush();
        return;
      case "screen":
        if (a.screen !== undefined) app.go(a.screen);
        return;
      case "state":
        if (a.screen !== undefined) app.go(a.screen);
        if (a.view) app.setView(a.view);
        if (a.idx !== undefined) app.setIdx(a.idx);
        if (a.preset) app.setPreset(a.preset as "flexible");
        return;
      case "hero":
        if (a.restart) app.restartHero();
        if ("hold" in a) app.setHeroHold(a.hold ?? null);
        return;
      case "spot":
        setSpot(a.target ?? null);
        return;
      case "dewy":
        if (a.mood) m.setMood(a.mood);
        if (a.say) m.say(a.say, { ms: (a.ms ?? 4000) / sp, badge: a.badge });
        if (a.align) void m.motion.alignWith(a.align);
        if (a.look) m.point(a.look);
        return;
      case "hover":
      case "click": {
        const el = a.target ? await find(a.target) : null;
        if (!el) return;
        const p = center(el);
        await moveCursor(p.x, p.y, 0.6);
        if (a.do === "click") { clickAt(p.x, p.y); (el as HTMLElement).click(); }
        return;
      }
      case "slide": {
        const el = (await find("#prio-slider input")) as HTMLInputElement | null;
        if (!el || a.to === undefined) return;
        const r = el.getBoundingClientRect();
        const thumb = (i: number) => r.left + 14 + (r.width - 28) * (i / Number(el.max || 20));
        let i = A.current.idx;
        await moveCursor(thumb(i), r.top + r.height / 2, 0.45);
        clickAt(thumb(i), r.top + r.height / 2);
        const steps = Math.abs(a.to - i);
        const per = ((a.dur ?? 2) * 1000) / Math.max(1, steps) / sp;
        while (i !== a.to) {
          i += a.to > i ? 1 : -1;
          A.current.setIdx(i);
          cx.set(thumb(i));
          await wait(per);
        }
        return;
      }
      case "type": {
        const el = (a.target ? await find(a.target) : null) as HTMLInputElement | null;
        if (!el || !a.text) return;
        const p = center(el);
        await moveCursor(p.x - el.getBoundingClientRect().width * 0.3, p.y, 0.5);
        clickAt(cx.get(), p.y);
        el.focus();
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
        const rand = rng(a.text.length * 7919);
        for (let k = 1; k <= a.text.length; k++) {
          setter.call(el, a.text.slice(0, k));
          el.dispatchEvent(new Event("input", { bubbles: true }));
          const base = 1000 / (a.cps ?? 30);
          await wait((base * (0.7 + rand() * 0.6) + (a.text[k - 1] === " " ? base * 0.4 : 0)) / sp);
        }
        return;
      }
      case "enter": {
        const el = (a.target ? await find(a.target) : null) as HTMLInputElement | null;
        el?.form?.requestSubmit();
        return;
      }
    }
  }, [moveCursor, clickAt, cx]);

  /* ------------------------------------------------------------ step changes */
  const applyStep = useCallback((s: Step) => {
    const m = M.current;
    m.setMood(s.mood);
    setSpot(s.spotlight);
    window.setTimeout(() => {
      if (s.align) void m.motion.alignWith(s.align);
      if (s.look) m.point(s.look);
    }, 500 / speedRef.current);
  }, []);

  /* ------------------------------------------------------------ clock */
  useEffect(() => {
    if (!P) return;
    M.current.setDriven(true);
    window.__greenqDemo = { started: performance.now(), done: false, total: P.total, preset: presetName };
    let last = performance.now(), raf = 0, lastShown = -1, cur = -1;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!pausedRef.current && !finished.current) t.current += dt * speedRef.current;
      const T = t.current;
      // current step
      let si = -1;
      for (let i = 0; i < P.steps.length; i++) if (P.steps[i].start <= T) si = i;
      if (si !== cur && si >= 0) { cur = si; setStepIdx(si); applyStep(P.steps[si]); }
      // due actions
      for (const s of P.steps) {
        if (s.start > T) break;
        s.actions.forEach((a, k) => {
          const key = `${s.id}:${k}`;
          if (!done.current.has(key) && s.start + a.at <= T) { done.current.add(key); void run(a); }
        });
      }
      if (T >= P.total && !finished.current) {
        finished.current = true;
        setSpot(null);
        setCursorOn(false);
        if (window.__greenqDemo) window.__greenqDemo.done = true;
      }
      if (Math.floor(T * 4) !== lastShown) { lastShown = Math.floor(T * 4); setShownT(T); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [P, presetName, run, applyStep]);

  // leaving the demo: give Dewy and the app back
  useEffect(() => () => {
    M.current.setDriven(false);
    M.current.hush();
    A.current.setHeroHold(null);
  }, []);

  const seek = useCallback((to: number) => {
    if (!P) return;
    t.current = to;
    finished.current = false;
    done.current = new Set();
    for (const s of P.steps) s.actions.forEach((a, k) => { if (s.start + a.at < to) done.current.add(`${s.id}:${k}`); });
    M.current.hush();
  }, [P]);
  const chapterAt = (T: number) => (P ? Math.max(0, P.chapters.filter((c) => c.start <= T + 0.01).length - 1) : 0);
  const jump = useCallback((d: number) => {
    if (!P) return;
    const ci = Math.min(P.chapters.length - 1, Math.max(0, chapterAt(t.current) + d));
    seek(P.chapters[ci].start);
  }, [P, seek]); // eslint-disable-line react-hooks/exhaustive-deps
  const exit = useCallback(() => A.current.stopDemo(), []);

  // keys: the player owns the keyboard while it runs
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) && e.isTrusted) return;
      if (e.key === " ") setPaused((p) => !p);
      else if (e.key === "ArrowRight") jump(1);
      else if (e.key === "ArrowLeft") jump(-1);
      else if (e.key === "r" || e.key === "R") seek(0);
      else if (e.key === "c" || e.key === "C") setCaptionsOn((c) => !c);
      else if (e.key === "Escape") exit();
      else return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener("keydown", on, { capture: true });
    return () => window.removeEventListener("keydown", on, { capture: true });
  }, [jump, seek, exit]);

  // player bar appears on mouse move (never in record mode)
  useEffect(() => {
    if (record) return;
    let h = 0;
    const on = () => { setBar(true); window.clearTimeout(h); h = window.setTimeout(() => setBar(false), 2600); };
    window.addEventListener("pointermove", on, { passive: true });
    on();
    return () => { window.removeEventListener("pointermove", on); window.clearTimeout(h); };
  }, [record]);

  // record mode hides the real mouse pointer
  useEffect(() => {
    if (!record) return;
    const st = document.createElement("style");
    st.textContent = "*{cursor:none!important}";
    document.head.appendChild(st);
    return () => st.remove();
  }, [record]);

  const step = P && stepIdx >= 0 ? P.steps[stepIdx] : null;
  const chapters = useMemo(() => P?.chapters ?? [], [P]);
  if (!tl) return null;

  return (
    <>
      <DemoSpotlight target={spot} />
      {/* virtual cursor */}
      <AnimatePresence>
        {cursorOn && (
          <motion.div key="cursor" className="pointer-events-none fixed top-0 left-0 z-[80]" style={{ x: cx, y: cy }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <svg width="28" height="34" viewBox="0 0 28 34" className="-translate-x-[3px] -translate-y-[2px] drop-shadow-[0_3px_6px_rgba(15,23,42,0.35)]" aria-hidden="true">
              <path d="M3 2 L3 26 L9.5 20 L14 31 L18.5 29 L14 18.5 L23 18.5 Z" fill="#0b0b0f" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {ripple && (
          <motion.span key={ripple.n} className="pointer-events-none fixed top-0 left-0 z-[79] block size-10 rounded-full border-2 border-foreground/50"
            style={{ x: ripple.x - 20, y: ripple.y - 20 }} initial={{ scale: 0.3, opacity: 0.9 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 0.55 }} />
        )}
      </AnimatePresence>
      {/* captions */}
      <AnimatePresence mode="wait">
        {captionsOn && step && (
          <motion.div key={step.id} className="pointer-events-none fixed bottom-[84px] left-[calc(50%-20px)] z-[70] -translate-x-1/2"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <p className="max-w-[1000px] rounded-2xl bg-foreground/88 px-6 py-3 text-center text-[22px] leading-snug font-medium text-white shadow-2xl">
              {step.captions.map((l, i) => <span key={i} className="block">{l}</span>)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      {/* player bar */}
      <AnimatePresence>
        {bar && P && (
          <motion.div key="bar" data-story-control className="fixed top-3 left-1/2 z-[90] -translate-x-1/2"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="flex items-center gap-1 rounded-full bg-white/95 p-1.5 text-[13px] font-medium shadow-xl ring-1 ring-border backdrop-blur">
              <span className="px-2 font-semibold">Full demo</span>
              <button className="rounded-full p-1.5 hover:bg-muted" onClick={() => jump(-1)} aria-label="Previous chapter (←)"><ChevronLeft className="size-4" /></button>
              <button className="rounded-full bg-foreground p-1.5 text-white" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Resume (Space)" : "Pause (Space)"}>
                {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
              </button>
              <button className="rounded-full p-1.5 hover:bg-muted" onClick={() => jump(1)} aria-label="Next chapter (→)"><ChevronRight className="size-4" /></button>
              <button className="rounded-full p-1.5 hover:bg-muted" onClick={() => seek(0)} aria-label="Restart (R)"><RotateCcw className="size-4" /></button>
              <span className="px-2 font-mono tabular-nums">{mmss(shownT)} / {mmss(P.total)}</span>
              <select aria-label="Chapter" className="rounded-full bg-muted px-2 py-1" value={chapterAt(shownT)} onChange={(e) => seek(chapters[Number(e.target.value)].start)}>
                {chapters.map((c, i) => <option key={c.id} value={i}>{mmss(c.start)} {c.title}</option>)}
              </select>
              <select aria-label="Preset" className="rounded-full bg-muted px-2 py-1" value={presetName}
                onChange={(e) => { setPresetName(e.target.value as DemoPreset); t.current = 0; done.current = new Set(); finished.current = false; }}>
                <option value="standard">Standard {mmss(tl.presets.standard.total)}</option>
                <option value="short">Short {mmss(tl.presets.short.total)}</option>
              </select>
              <select aria-label="Speed" className="rounded-full bg-muted px-2 py-1" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                {[0.75, 1, 1.25].map((s) => <option key={s} value={s}>{s}×</option>)}
              </select>
              <button className={`rounded-full p-1.5 hover:bg-muted ${captionsOn ? "text-foreground" : "text-muted-foreground"}`} onClick={() => setCaptionsOn((c) => !c)} aria-label="Captions (C)"><Subtitles className="size-4" /></button>
              <button className="rounded-full p-1.5 hover:bg-muted" onClick={exit} aria-label="Stop demo (Esc)"><X className="size-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Dims the stage except one widget (same look as the tour). */
function DemoSpotlight({ target }: { target: string | null }) {
  const [hole, setHole] = useState<DOMRect | null>(null);
  const [stage, setStage] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (!target) { setHole(null); return; }
    let alive = true;
    const measure = () => {
      if (!alive) return;
      const el = document.querySelector(target);
      const main = document.querySelector("main");
      setHole(el && el.getBoundingClientRect().width > 0 ? el.getBoundingClientRect() : null);
      setStage(main?.getBoundingClientRect() ?? null);
    };
    const t1 = window.setTimeout(measure, 450);
    const iv = window.setInterval(measure, 400);
    return () => { alive = false; window.clearTimeout(t1); window.clearInterval(iv); };
  }, [target]);
  const pad = 12;
  return (
    <AnimatePresence>
      {hole && stage && (
        <motion.svg key="spot" className="pointer-events-none fixed z-50" style={{ left: stage.left, top: stage.top, width: stage.width, height: stage.height }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} aria-hidden="true">
          <defs>
            <mask id="demoHole">
              <rect width="100%" height="100%" fill="white" />
              <motion.rect rx={24} fill="black" initial={false}
                animate={{ x: hole.left - stage.left - pad, y: hole.top - stage.top - pad, width: hole.width + 2 * pad, height: hole.height + 2 * pad }}
                transition={{ type: "spring", visualDuration: 0.5, bounce: 0.1 }} />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(15,23,42,0.32)" mask="url(#demoHole)" />
        </motion.svg>
      )}
    </AnimatePresence>
  );
}
