import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Eye, EyeOff } from "lucide-react";
import { prefersReducedMotion } from "@/format";
import { useCompact } from "@/lib/stage";
import { Badge, type BadgeKind } from "@/components/slides/ui";
import { Dewy, type Mood } from "./Dewy";

/**
 * Mascot controller, shared through context so any screen can drive Dewy:
 *   setMood(mood, { for })   play a mood; with `for` (ms) it returns to idle and fires onMoodEnd
 *   say(text, { ms, badge }) one-line speech bubble (max ~10 words; numbers only from data)
 *   point(target)            look and lean toward an element (or a CSS selector); null = straight
 *   placeAt(rect | null)     move next to a widget (guided tour); null = home corner
 *   onMoodEnd(cb)            subscribe to timed-mood endings; returns an unsubscribe function
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
}

const Ctx = createContext<Mascot | null>(null);
export const useMascot = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMascot outside MascotProvider");
  return v;
};

type Bubble = { id: number; text: string; badge?: BadgeKind };

export function MascotProvider({ children }: { children: ReactNode }) {
  const [mood, setMoodState] = useState<Mood>("waking");
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [look, setLook] = useState<[number, number]>([0, 0]);
  const [spot, setSpot] = useState<DOMRect | null>(null);
  const [hidden, setHidden] = useState(false);
  const moodTimer = useRef<number>(0);
  const bubbleTimer = useRef<number>(0);
  const listeners = useRef(new Set<(m: Mood) => void>());
  const home = useRef<HTMLDivElement>(null);

  const setMood = useCallback((m: Mood, o?: { for?: number }) => {
    window.clearTimeout(moodTimer.current);
    setMoodState(m);
    if (o?.for) {
      moodTimer.current = window.setTimeout(() => {
        setMoodState("idle");
        listeners.current.forEach((cb) => cb(m));
      }, o.for);
    }
  }, []);

  const say = useCallback((text: string, o?: { ms?: number; badge?: BadgeKind }) => {
    window.clearTimeout(bubbleTimer.current);
    setBubble({ id: Date.now(), text, badge: o?.badge });
    bubbleTimer.current = window.setTimeout(() => setBubble(null), o?.ms ?? 3800);
  }, []);
  const hush = useCallback(() => { window.clearTimeout(bubbleTimer.current); setBubble(null); }, []);

  const point = useCallback((t: Element | string | null) => {
    const el = typeof t === "string" ? document.querySelector(t) : t;
    const me = home.current?.getBoundingClientRect();
    if (!el || !me) return setLook([0, 0]);
    const r = el.getBoundingClientRect();
    const dx = r.left + r.width / 2 - (me.left + me.width / 2);
    const dy = r.top + r.height / 2 - (me.top + me.height / 2);
    const d = Math.hypot(dx, dy) || 1;
    setLook([dx / d, dy / d]);
  }, []);

  const onMoodEnd = useCallback((cb: (m: Mood) => void) => {
    listeners.current.add(cb);
    return () => { listeners.current.delete(cb); };
  }, []);

  const toggle = useCallback(() => setHidden((h) => !h), []);

  // waking -> idle when the app opens
  useEffect(() => {
    const t = window.setTimeout(() => setMoodState((m) => (m === "waking" ? "idle" : m)), 1800);
    return () => window.clearTimeout(t);
  }, []);

  // H hides or shows Dewy (ignored while typing)
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || el?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el?.tagName ?? "")) return;
      if (e.key === "h" || e.key === "H") { setHidden((h) => !h); e.preventDefault(); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  const value = useMemo<Mascot>(
    () => ({ mood, setMood, say, hush, point, placeAt: setSpot, onMoodEnd, hidden, toggle }),
    [mood, setMood, say, hush, point, onMoodEnd, hidden, toggle],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <MascotLayer mood={mood} look={look} bubble={bubble} spot={spot} hidden={hidden} homeRef={home} onPoke={() => setMood("laughing", { for: 1600 })} toggle={toggle} />
    </Ctx.Provider>
  );
}

/** Where Dewy stands: home corner (bottom-right, above the footer), or beside a widget during the tour. */
function MascotLayer({ mood, look, bubble, spot, hidden, homeRef, onPoke, toggle }: {
  mood: Mood; look: [number, number]; bubble: Bubble | null; spot: DOMRect | null; hidden: boolean;
  homeRef: React.RefObject<HTMLDivElement | null>; onPoke: () => void; toggle: () => void;
}) {
  const compact = useCompact();
  const reduced = prefersReducedMotion();
  const [, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick((n) => n + 1);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const size = compact ? 64 : 88;
  const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16; // stage scale
  const w = size * rootPx, h = size * 1.25 * rootPx;
  // Tour: stand just right of (or left of, near the right edge) the widget, bottom-aligned.
  let pos: { left: number; top: number } | null = null;
  if (spot) {
    const right = spot.right + 12 + w < window.innerWidth;
    pos = { left: right ? spot.right + 12 : Math.max(8, spot.left - w - 12), top: Math.min(window.innerHeight - h - 70 * rootPx, Math.max(8, spot.bottom - h)) };
  }
  const bubbleLeft = !pos || pos.left > window.innerWidth / 2;
  return (
    <>
      <motion.div
        ref={homeRef}
        className="fixed z-[60]"
        initial={false}
        animate={
          pos
            ? { left: pos.left, top: pos.top, right: "auto", bottom: "auto", opacity: hidden ? 0 : 1 }
            : { left: window.innerWidth - w - (compact ? 10 : 18) * rootPx, top: window.innerHeight - h - (compact ? 64 : 8) * rootPx, opacity: hidden ? 0 : 1 }
        }
        transition={reduced ? { duration: 0 } : { type: "spring", visualDuration: 0.6, bounce: 0.2 }}
        style={{ pointerEvents: hidden ? "none" : "auto" }}
        aria-hidden={hidden}
      >
        <Dewy mood={mood} size={size} look={look} onClick={onPoke} />
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
              className={`absolute bottom-[70%] w-max max-w-[340px] rounded-2xl bg-white px-4 py-2.5 text-[16px] leading-snug font-medium text-foreground shadow-[0_12px_32px_-12px_rgba(15,23,42,0.45)] ring-1 ring-border ${bubbleLeft ? "right-[85%] rounded-br-md" : "left-[85%] rounded-bl-md"}`}
            >
              {bubble.text}
              {bubble.badge && <span className="mt-1.5 block"><Badge kind={bubble.badge} /></span>}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <button
        onClick={toggle}
        className={`fixed z-[61] flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-border hover:text-foreground ${compact ? "right-2 bottom-[64px]" : "right-3 bottom-2"} ${hidden ? "" : "opacity-60 hover:opacity-100"}`}
        aria-label={hidden ? "Show Dewy (H)" : "Hide Dewy (H)"}
        title={hidden ? "Show Dewy (H)" : "Hide Dewy (H)"}
      >
        {hidden ? <Eye className="size-3.5" aria-hidden="true" /> : <EyeOff className="size-3.5" aria-hidden="true" />}
        {hidden && "Dewy"}
      </button>
    </>
  );
}
