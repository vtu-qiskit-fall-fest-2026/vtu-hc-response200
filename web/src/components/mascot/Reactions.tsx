import { useEffect, useRef } from "react";
import { useApp } from "@/lib/data";
import { useMascot } from "./MascotProvider";

/**
 * Dewy's reactions to the page (the handout's "moments"), driven through the
 * movement controller so Dewy only ever moves inside its lane:
 *   no input 30 s -> drowsy, 45 s -> sleeping; any input -> a startled hop awake
 *   Quantum screen -> thinking + small hops while gates light, working, proud
 *   slider -> line up with the slider, tilt with the thumb, glance at the curve
 *   hovering a button -> line up with it and look at it; clicking -> a cheer
 *   chat input -> line up with it, tilt the head while typing
 * Play hover (excited), savings shown (bounce + celebrate) and AI answers are
 * triggered where they happen. The tour and the Demo Director drive Dewy themselves.
 */
export function Reactions() {
  const { screen, idx, playing, tour } = useApp();
  const mascot = useMascot();
  const m = useRef(mascot);
  m.current = mascot;
  const busy = useRef(false);
  busy.current = !!tour || playing;

  // sleepiness, and waking with a startled hop
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
      if (m.current.mood === "drowsy" || m.current.mood === "sleeping") {
        m.current.setMood("waking", { for: 1300 });
        void m.current.motion.bounce(1, 26);
      }
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
  useEffect(() => { wake.current(); }, [screen, playing, idx]);

  // Quantum screen: think and hop with the gates, work while shots land, then proud.
  // If the presenter then stays here without input, Dewy calms down (no wandering).
  useEffect(() => {
    if (screen !== 2 || busy.current) return;
    const M = m.current;
    M.setMood("thinking");
    const t0 = window.setTimeout(() => {
      M.motion.look(document.querySelector("[data-widget=circuit]"));
      void M.motion.bounce(4, 8);
    }, 700);
    const a = window.setTimeout(() => !busy.current && m.current.setMood("working"), 2200);
    const b = window.setTimeout(() => {
      if (busy.current) return;
      m.current.setMood("proud", { for: 2600 });
      m.current.motion.look(document.querySelector("[data-widget=histogram]"));
    }, 4600);
    let calm = 0;
    const arm = () => { window.clearTimeout(calm); calm = window.setTimeout(() => m.current.setQuiet(true), 9000); };
    const onInput = () => { if (m.current.quiet) m.current.setQuiet(false); arm(); };
    window.addEventListener("pointermove", onInput, { passive: true });
    arm();
    return () => {
      [t0, a, b, calm].forEach((t) => window.clearTimeout(t));
      window.removeEventListener("pointermove", onInput);
      m.current.setQuiet(false);
    };
  }, [screen]);

  // slider: follow it in the lane, tilt with the thumb, then glance at the curve
  const first = useRef(true);
  const slideTimer = useRef(0);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (screen !== 1) return;
    const M = m.current;
    if (!busy.current) M.setMood("curious", { for: 2400 });
    const slider = document.querySelector("#prio-slider");
    if (slider && !busy.current && !M.motion.moving) void M.motion.alignWith(slider);
    M.motion.tilt((idx - 10) * 0.8);
    M.point("#prio-slider");
    window.clearTimeout(slideTimer.current);
    slideTimer.current = window.setTimeout(() => {
      M.motion.tilt(0);
      M.point("[data-widget=tradeoff]");
    }, 900);
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  // buttons: line up and look after a short hover; cheer on click
  useEffect(() => {
    let dwell = 0, lastHop = 0;
    const over = (e: PointerEvent) => {
      const btn = (e.target as HTMLElement | null)?.closest?.("main button, main [role=tab]");
      window.clearTimeout(dwell);
      if (!btn || busy.current) return;
      dwell = window.setTimeout(() => {
        const M = m.current;
        if (M.motion.moving || performance.now() - lastHop < 2500) return M.point(btn);
        lastHop = performance.now();
        void M.motion.alignWith(btn);
      }, 450);
    };
    const click = (e: MouseEvent) => {
      if (busy.current || !(e.target as HTMLElement | null)?.closest?.("main button")) return;
      m.current.setMood("excited", { for: 900 });
      void m.current.motion.bounce(1, 14);
    };
    // chat input: line up, tilt the head while typing
    let tiltSide = 1;
    const focus = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.matches?.("main input[aria-label='Your question']") && !busy.current) void m.current.motion.alignWith(el);
    };
    const typing = (e: Event) => {
      const el = e.target as HTMLElement | null;
      if (!el?.matches?.("main input[aria-label='Your question']") || busy.current) return;
      tiltSide = -tiltSide;
      m.current.motion.tilt(5 * tiltSide);
      m.current.setMood("curious", { for: 1200 });
    };
    window.addEventListener("pointerover", over, { passive: true });
    window.addEventListener("click", click);
    window.addEventListener("focusin", focus);
    window.addEventListener("input", typing);
    return () => {
      window.clearTimeout(dwell);
      window.removeEventListener("pointerover", over);
      window.removeEventListener("click", click);
      window.removeEventListener("focusin", focus);
      window.removeEventListener("input", typing);
    };
  }, []);

  return null;
}
