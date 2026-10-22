import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useTransform } from "motion/react";
import { Eye, EyeOff } from "lucide-react";
import { prefersReducedMotion } from "@/format";
import { isCompact, useCompact } from "@/lib/stage";
import { useApp } from "@/lib/data";
import { Badge, type BadgeKind } from "@/components/slides/ui";
import { Dewy, type Mood } from "./Dewy";
import { DewyMotion } from "./controller";
import { HOME_STOP } from "./zones";

/**
 * Dewy's context. Moods and speech:
 *   setMood(mood, { for })   play a mood; with `for` (ms) it returns to idle and fires onMoodEnd
 *   say(text, { ms, badge }) one-line speech bubble (max ~10 words; numbers only from data)
 *   point(target)            look toward an element (or selector); null = straight ahead
 *   placeAt(rect | null)     line up with a widget in the lane (tour); null = this screen's home spot
 * Movement lives in `motion` (controller.ts), shared with the tour and the Demo Director.
 */
export interface Mascot {
  mood: Mood;
  setMood: (m: Mood, o?: { for?: number }) => void;
  say: (text: string, o?: { ms?: number; badge?: BadgeKind }) => void;
  hush: () => void;
  point: (t: Element | string | null) => void;
  placeAt: (r: DOMRect | null) => void;
  onMoodEnd: (cb: (m: Mood) => void) => () => void;
  hidden: boolean;
  toggle: () => void;
  quiet: boolean;
  setQuiet: (q: boolean) => void;
  motion: DewyMotion;
  /** Director/tour mode: no wandering, no cursor-following (set by whoever drives Dewy). */
  setDriven: (d: boolean) => void;
}

const Ctx = createContext<Mascot | null>(null);
export const useMascot = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMascot outside MascotProvider");
  return v;
};

type Bubble = { id: number; text: string; badge?: BadgeKind; side: "above" | "left" };
const stageScale = () => parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
const RECORD = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("record");

export function MascotProvider({ children }: { children: ReactNode }) {
  const reducedMotion = prefersReducedMotion();
  const { screen, tour, playing } = useApp();
  const ctl = useRef<DewyMotion | null>(null);
  if (!ctl.current) ctl.current = new DewyMotion(stageScale, isCompact, reducedMotion);
  const m = ctl.current;

  const [mood, setMoodState] = useState<Mood>(reducedMotion ? "idle" : "waking");
  const moodRef = useRef(mood);
  moodRef.current = mood;
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [hidden, setHidden] = useState(false);
  const [quiet, setQuietState] = useState(false);
  const [driven, setDrivenState] = useState(false);
  const moodTimer = useRef<number>(0);
  const bubbleTimer = useRef<number>(0);
  const listeners = useRef(new Set<(m: Mood) => void>());
  const lookLock = useRef(0);

  const setMood = useCallback((next: Mood, o?: { for?: number }) => {
    if (reducedMotion) return;
    window.clearTimeout(moodTimer.current);
    setMoodState(next);
    if (o?.for) {
      moodTimer.current = window.setTimeout(() => {
        setMoodState("idle");
        listeners.current.forEach((cb) => cb(next));
      }, o.for);
    }
  }, [reducedMotion]);

  const say = useCallback((text: string, o?: { ms?: number; badge?: BadgeKind }) => {
    window.clearTimeout(bubbleTimer.current);
    // left of Dewy: Dewy lives in the right-edge lane, so "above" can leave the screen at the top
    const side = m.y.get() > 520 * stageScale() ? "above" : "left";
    setBubble({ id: Date.now(), text, badge: o?.badge, side });
    bubbleTimer.current = window.setTimeout(() => setBubble(null), o?.ms ?? 3800);
  }, [m]);
  const hush = useCallback(() => { window.clearTimeout(bubbleTimer.current); setBubble(null); }, []);

  const point = useCallback((t: Element | string | null) => {
    const el = typeof t === "string" ? document.querySelector(t) : t;
    lookLock.current = el ? performance.now() + 3000 : 0;
    m.look(el);
  }, [m]);

  const placeAt = useCallback((r: DOMRect | null) => {
    if (r) void m.alignWith(r);
    else void m.hopTo(HOME_STOP[screen] ?? 3);
  }, [m, screen]);

  const onMoodEnd = useCallback((cb: (x: Mood) => void) => {
    listeners.current.add(cb);
    return () => { listeners.current.delete(cb); };
  }, []);
  const toggle = useCallback(() => setHidden((h) => !h), []);
  const setQuiet = useCallback((q: boolean) => { setQuietState(q); m.quietMode = q; }, [m]);
  const setDriven = useCallback((d: boolean) => setDrivenState(d), []);

  // waking -> idle when the app opens
  useEffect(() => {
    const t = window.setTimeout(() => setMoodState((x) => (x === "waking" ? "idle" : x)), 1800);
    return () => window.clearTimeout(t);
  }, []);

  // H hides Dewy; Shift+H calms it (blinking only)
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || el?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el?.tagName ?? "")) return;
      if (e.key === "H" && e.shiftKey) { setQuiet(!m.quietMode); e.preventDefault(); }
      else if (e.key === "h" || e.key === "H") { setHidden((h) => !h); e.preventDefault(); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [m, setQuiet]);

  // place on first paint and on resize
  useEffect(() => {
    const t = window.setTimeout(() => m.place(HOME_STOP[screen] ?? 3), 60);
    const onResize = () => m.place();
    window.addEventListener("resize", onResize);
    return () => { window.clearTimeout(t); window.removeEventListener("resize", onResize); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // new screen: hop to that screen's spot and wave (not while the tour or the director drives)
  const firstScreen = useRef(true);
  useEffect(() => {
    if (firstScreen.current) { firstScreen.current = false; return; }
    if (tour || driven) return;
    const t = window.setTimeout(async () => {
      await m.hopTo(HOME_STOP[screen] ?? 3);
      if (!m.quietMode) { m.wiggle(); setMood("excited", { for: 900 }); }
    }, 520);
    return () => window.clearTimeout(t);
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  // idle life: hops, wandering, personality (paused when hidden, quiet, driven or sleepy)
  const busy = useRef(false);
  busy.current = !!tour || playing || driven || RECORD;
  useEffect(() => {
    const can = () => !busy.current && !["drowsy", "sleeping"].includes(moodRef.current);
    m.startIdle(can);
    const vis = () => (document.hidden ? m.stopIdle() : m.startIdle(can));
    document.addEventListener("visibilitychange", vis);
    return () => { m.stopIdle(); document.removeEventListener("visibilitychange", vis); };
  }, [m]);

  // eyes follow the cursor; lean toward it when it rests nearby; blink at a fast sweep
  const [surprise, setSurprise] = useState(0);
  useEffect(() => {
    if (reducedMotion || RECORD) return;
    let last = { x: 0, y: 0, t: 0 }, lastSurprise = 0, rest = 0;
    const on = (e: PointerEvent) => {
      if (busy.current || performance.now() < lookLock.current) return;
      m.look({ x: e.clientX, y: e.clientY });
      const now = performance.now();
      const v = Math.hypot(e.clientX - last.x, e.clientY - last.y) / Math.max(1, now - last.t);
      last = { x: e.clientX, y: e.clientY, t: now };
      const { cx, cy } = m.center();
      const d = Math.hypot(e.clientX - cx, e.clientY - cy);
      if (v > 4 && d < 700 && now - lastSurprise > 2500) { lastSurprise = now; setSurprise((n) => n + 1); }
      window.clearTimeout(rest);
      if (!m.moving) m.tilt(0);
      if (d < 280 * stageScale()) rest = window.setTimeout(() => !m.moving && m.tilt(e.clientX < cx ? -7 : 7), 700);
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => window.removeEventListener("pointermove", on);
  }, [m, reducedMotion]);

  const value = useMemo<Mascot>(
    () => ({ mood, setMood, say, hush, point, placeAt, onMoodEnd, hidden, toggle, quiet, setQuiet, motion: m, setDriven }),
    [mood, setMood, say, hush, point, placeAt, onMoodEnd, hidden, toggle, quiet, setQuiet, m, setDriven],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <MascotLayer m={m} mood={mood} bubble={bubble} hidden={hidden} surprise={surprise}
        onPoke={() => { setMood("laughing", { for: 1600 }); void m.bounce(1, 18); }}
        onHover={() => { if (!m.moving && moodRef.current === "idle") { setMood("laughing", { for: 900 }); void m.bounce(1, 12); } }}
        toggle={toggle} />
    </Ctx.Provider>
  );
}

/** Dewy, its ground shadow, the landing splash and the speech bubble, all driven by Motion values. */
function MascotLayer({ m, mood, bubble, hidden, surprise, onPoke, onHover, toggle }: {
  m: DewyMotion; mood: Mood; bubble: Bubble | null; hidden: boolean; surprise: number;
  onPoke: () => void; onHover: () => void; toggle: () => void;
}) {
  const compact = useCompact();
  const reduced = prefersReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);
  const [splash, setSplash] = useState<{ n: number; x: number; y: number } | null>(null);
  useEffect(() => {
    const on = () => setTick((n) => n + 1);
    window.addEventListener("resize", on);
    m.onLand = () => {
      const { w, h } = m.size();
      setSplash((s) => ({ n: (s?.n ?? 0) + 1, x: m.x.get() + w / 2, y: m.y.get() + h - 4 }));
    };
    m.onMovingChange = (moving) => { if (box.current) box.current.style.pointerEvents = moving || hidden ? "none" : "auto"; };
    return () => window.removeEventListener("resize", on);
  }, [m, hidden]);

  const { w, h } = m.size();
  const shadowX = useTransform(m.x, (v) => v + w * 0.15);
  const shadowY = useTransform(m.groundY, (v) => v + h - 6);
  const shadowScale = useTransform(m.air, (a) => 1 - a * 0.55);
  const shadowOpacity = useTransform(m.air, (a) => 0.16 - a * 0.1);

  return (
    <>
      {/* ground shadow: stays on the ground while Dewy is in the air */}
      <motion.div aria-hidden="true" className="pointer-events-none fixed top-0 left-0 z-[59] rounded-[50%] bg-slate-900"
        style={{ x: shadowX, y: shadowY, width: w * 0.7, height: 10 * (w / 104), scale: shadowScale, opacity: hidden ? 0 : shadowOpacity }} />
      <motion.div
        ref={box}
        data-dewy
        className="fixed top-0 left-0 z-[60]"
        style={{ x: m.x, y: m.y, width: w, height: h, opacity: hidden ? 0 : 1, transition: "opacity 0.25s", pointerEvents: hidden ? "none" : "auto" }}
        aria-hidden={hidden}
        onPointerEnter={onHover}
      >
        <motion.div className="h-full w-full" style={{ scaleX: m.sx, scaleY: m.sy, rotate: m.rot, transformOrigin: "50% 100%" }}>
          <Dewy mood={mood} size={w / stageScale()} lookX={m.lookX} lookY={m.lookY} shadow={false} blinkSignal={surprise} onClick={onPoke} />
        </motion.div>
        <AnimatePresence>
          {bubble && !hidden && (
            <motion.div
              key={bubble.id}
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: reduced ? 0 : 0.22 }}
              className={`pointer-events-none absolute w-max max-w-[300px] rounded-2xl bg-white px-4 py-2.5 text-[16px] leading-snug font-medium text-foreground shadow-[0_12px_32px_-12px_rgba(15,23,42,0.45)] ring-1 ring-border ${
                bubble.side === "above" ? "right-0 bottom-[92%] rounded-br-md" : "top-[18%] right-[92%] rounded-tr-md"}`}
            >
              {bubble.text}
              {bubble.badge && <span className="mt-1.5 block"><Badge kind={bubble.badge} /></span>}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      {/* landing splash: three droplets */}
      <AnimatePresence>
        {splash && !reduced && !hidden && (
          <motion.div key={splash.n} className="pointer-events-none fixed top-0 left-0 z-[59]" style={{ x: splash.x, y: splash.y }}
            initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.6, delay: 0.25 }}>
            {[-1, 0, 1].map((d) => (
              <motion.span key={d} className="absolute block size-2 rounded-full bg-sky-400"
                initial={{ x: 0, y: 0, scale: 0.6 }} animate={{ x: d * 22, y: [0, -14 - (d === 0 ? 8 : 0), 4], scale: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={toggle}
        className={`fixed z-[61] flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-border hover:text-foreground ${compact ? "right-2 bottom-[64px]" : "right-3 bottom-[17px]"} ${hidden ? "" : "opacity-50 hover:opacity-100"}`}
        aria-label={hidden ? "Show Dewy (H)" : "Hide Dewy (H)"}
        title={hidden ? "Show Dewy (H) · Shift+H: calm" : "Hide Dewy (H) · Shift+H: calm"}
      >
        {hidden ? <Eye className="size-3.5" aria-hidden="true" /> : <EyeOff className="size-3.5" aria-hidden="true" />}
        {hidden && "Dewy"}
      </button>
    </>
  );
}
