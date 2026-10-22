import { useEffect, useRef } from "react";
import { useApp } from "@/lib/data";
import { useMascot } from "./MascotProvider";

/**
 * Dewy's reactions to what happens in the app (the handout's "moments"):
 *   app opens -> waking, then idle (MascotProvider)
 *   no input for 30 s -> drowsy, 45 s -> sleeping; any input -> waking
 *   Quantum screen -> thinking (circuit) -> working (histogram) -> proud
 *   slider moves -> curious, looks at the slider, then at the trade-off curve
 * Play hover (excited), savings shown (celebrate), AI fallback (confused) and a
 * click (laughing) are triggered where they happen. The tour sets its own moods.
 */
export function Reactions() {
  const { screen, idx, playing, tour } = useApp();
  const mascot = useMascot();
  const m = useRef(mascot);
  m.current = mascot;
  const busy = useRef(false);
  busy.current = !!tour;

  // sleepiness
  const wake = useRef<() => void>(() => {});
  useEffect(() => {
    let t1 = 0, t2 = 0;
    const arm = () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      t1 = window.setTimeout(() => !busy.current && m.current.setMood("drowsy"), 30000);
      t2 = window.setTimeout(() => !busy.current && m.current.setMood("sleeping"), 45000);
    };
    wake.current = () => {
      if (m.current.mood === "drowsy" || m.current.mood === "sleeping") m.current.setMood("waking", { for: 1300 });
      arm();
    };
    const on = () => wake.current();
    const evs = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"] as const;
    evs.forEach((e) => window.addEventListener(e, on, { passive: true }));
    arm();
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      evs.forEach((e) => window.removeEventListener(e, on));
    };
  }, []);
  // the story counts as activity
  useEffect(() => { wake.current(); }, [screen, playing, idx]);

  // Quantum screen: think while the circuit lights, work while shots land, then proud
  useEffect(() => {
    if (screen !== 2 || busy.current) return;
    m.current.setMood("thinking");
    const a = window.setTimeout(() => !busy.current && m.current.setMood("working"), 1900);
    const b = window.setTimeout(() => !busy.current && m.current.setMood("proud", { for: 2600 }), 4300);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, [screen]);

  // slider: curious, look at the slider, then the curve
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (screen !== 1) return;
    if (!busy.current) m.current.setMood("curious", { for: 2400 });
    m.current.point("#prio-slider");
    const a = window.setTimeout(() => m.current.point("[data-widget=tradeoff]"), 800);
    const b = window.setTimeout(() => !busy.current && m.current.point(null), 2400);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
