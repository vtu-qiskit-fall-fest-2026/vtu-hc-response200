import { useCallback, useEffect, useRef, useState } from "react";
import type { View } from "./data";

/** Caption ids, in story order. The words come from results/llm_cache.json
 *  (pre-generated narration) or, if that's missing, from FALLBACK below. */
export type CaptionId = "start" | "run_now" | "run_smart" | "tradeoff" | "circuit" | "histogram";

export const FALLBACK_CAPTIONS: Record<CaptionId, string> = {
  start: "Same four jobs, two data centres, day or night. Where and when they run changes the footprint.",
  run_now: "Run now: every job starts at home the moment it arrives. Site A gets crowded at night.",
  run_smart: "Run smart: jobs move to cleaner slots and drier cooling. Same work, lower footprint.",
  tradeoff: "Carbon and water pull against each other. The slider walks every compromise.",
  circuit: "This is the real circuit: a where and a when qubit for each job.",
  histogram: "On real IBM hardware more shots land on cheap schedules than random guessing.",
};

interface Hooks {
  setScreen: (i: number) => void;
  setIdx: (i: number) => void;
  setView: (v: View) => void;
  setCaption: (c: CaptionId | null) => void;
  balanced: number;
  last: number;
}

/**
 * About 35 seconds over screens 1-3, for the video: Start -> Run now -> Run
 * smart -> slider sweep -> circuit -> histogram. Pointer or wheel input pauses it
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
    at(0, () => { H().setIdx(balanced); H().setView("before"); H().setScreen(0); H().setCaption("start"); });
    at(5500, () => { H().setScreen(1); H().setView("before"); H().setCaption("run_now"); });
    at(9500, () => { H().setView("greenq"); H().setCaption("run_smart"); });
    at(14000, () => H().setCaption("tradeoff"));
    let t = sweep(14600, balanced, last);
    t = sweep(t + 1100, last, 0);
    t = sweep(t + 1100, 0, balanced);
    at(t + 1200, () => { H().setScreen(2); H().setCaption("circuit"); });
    at(t + 6200, () => H().setCaption("histogram"));
    at(t + 12500, () => { setPlaying(false); H().setCaption(null); timers.current = []; });
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
