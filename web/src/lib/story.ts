import { useCallback, useEffect, useRef, useState } from "react";
import type { View } from "./data";
import type { TourState } from "./tour";

/** Caption ids, in story order. The words come from results/llm_cache.json
 *  (pre-generated narration) or, if that's missing, from FALLBACK below. */
export type CaptionId = "start" | "run_now" | "run_smart" | "tradeoff" | "circuit" | "histogram" | "compare" | "ask" | "about";

export const FALLBACK_CAPTIONS: Record<CaptionId, string> = {
  start: "Same four jobs, two data centres, day or night. Where and when they run changes the footprint.",
  run_now: "Run now: every job starts at home the moment it arrives. Site A gets crowded at night.",
  run_smart: "Run smart: jobs move to cleaner slots and drier cooling. Same work, lower footprint.",
  tradeoff: "Carbon and water pull against each other. The slider walks every compromise.",
  circuit: "This is the real circuit: a where and a when qubit for each job.",
  histogram: "On real IBM hardware more shots land on cheap schedules than random guessing.",
  compare: "Simple classical methods find the same answer, faster. We show that on purpose.",
  ask: "Ask GreenQ explains the saved results. It never picks the schedule.",
  about: "Cited where we could, labelled where we couldn't. No quantum advantage claimed.",
};

interface Hooks {
  setScreen: (i: number) => void;
  setIdx: (i: number) => void;
  setView: (v: View) => void;
  setCaption: (c: CaptionId | null) => void;
  setTour: (t: TourState) => void;
  balanced: number;
  last: number;
}

/**
 * About 50 seconds over all six screens, for the video: Start -> Run now -> Run
 * smart -> slider sweep -> circuit -> histogram -> Compare -> Ask -> About, with
 * Dewy's tour spotlight on one widget per screen. Pointer or wheel input pauses it
 * (except on [data-story-control]); the keyboard handler pauses it too.
 */
export function useStory(h: Hooks) {
  const [playing, setPlaying] = useState(false);
  const timers = useRef<number[]>([]);
  const hooks = useRef(h);
  hooks.current = h;

  const stop = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setPlaying(false);
    hooks.current.setCaption(null);
    hooks.current.setTour(null);
  }, []);

  const play = useCallback(() => {
    stop();
    setPlaying(true);
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    const sweep = (start: number, from: number, to: number, step = 110) => {
      const dir = to > from ? 1 : -1;
      let t = start;
      for (let i = from; i !== to + dir; i += dir) {
        const v = i;
        at(t, () => hooks.current.setIdx(v));
        t += step;
      }
      return t;
    };
    const { balanced, last } = hooks.current;
    const H = () => hooks.current;
    const tour = (i: number | null) => H().setTour(i === null ? null : { step: i, mode: "story" });
    at(0, () => { H().setIdx(balanced); H().setView("before"); H().setScreen(0); H().setCaption("start"); tour(0); });
    at(5500, () => { tour(null); H().setScreen(1); H().setView("before"); H().setCaption("run_now"); });
    at(9500, () => { H().setView("greenq"); H().setCaption("run_smart"); });
    at(14000, () => { H().setCaption("tradeoff"); tour(1); });
    let t = sweep(14600, balanced, last);
    t = sweep(t + 1100, last, 0);
    t = sweep(t + 1100, 0, balanced);
    at(t + 1200, () => { tour(null); H().setScreen(2); H().setCaption("circuit"); });
    at(t + 6200, () => { H().setCaption("histogram"); tour(2); });
    at(t + 11500, () => { tour(null); H().setScreen(3); H().setCaption("compare"); });
    at(t + 12300, () => tour(3));
    at(t + 17000, () => { tour(null); H().setScreen(4); H().setCaption("ask"); });
    at(t + 17800, () => tour(4));
    at(t + 22500, () => { tour(null); H().setScreen(5); H().setCaption("about"); });
    at(t + 23300, () => tour(5));
    at(t + 29000, () => { setPlaying(false); H().setCaption(null); tour(null); timers.current = []; });
  }, [stop]);

  useEffect(() => {
    if (!playing) return;
    const pause = (e: Event) => {
      if ((e.target as HTMLElement | null)?.closest?.("[data-story-control]")) return;
      stop();
    };
    window.addEventListener("wheel", pause, { passive: true });
    window.addEventListener("pointerdown", pause);
    window.addEventListener("touchstart", pause, { passive: true });
    return () => {
      window.removeEventListener("wheel", pause);
      window.removeEventListener("pointerdown", pause);
      window.removeEventListener("touchstart", pause);
    };
  }, [playing, stop]);

  useEffect(() => () => timers.current.forEach((x) => window.clearTimeout(x)), []);
  const togglePlay = useCallback(() => (playing ? stop() : play()), [playing, stop, play]);
  return { playing, togglePlay, stop };
}
