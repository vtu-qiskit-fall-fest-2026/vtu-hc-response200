import { useCallback, useEffect, useRef, useState } from "react";
import type { View } from "./data";

const scrollTo = (sel: string) =>
  document.querySelector(sel)?.scrollIntoView({ behavior: "smooth", block: "start" });

/**
 * About 20 seconds, for the video: business as usual -> jobs move -> savings
 * count up -> slider sweeps to carbon only, then water only, then back ->
 * the circuit -> the histogram. Any user input (wheel, key, pointer outside the
 * play button) pauses it.
 */
export function useStory(setIdx: (i: number) => void, setView: (v: View) => void, balanced: number, last: number) {
  const [playing, setPlaying] = useState(false);
  const timers = useRef<number[]>([]);

  const stop = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setPlaying(false);
  }, []);

  const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

  const sweep = (start: number, from: number, to: number, step = 110) => {
    const dir = to > from ? 1 : -1;
    let t = start;
    for (let i = from; i !== to + dir; i += dir) {
      const v = i;
      at(t, () => setIdx(v));
      t += step;
    }
    return t;
  };

  const play = useCallback(() => {
    stop();
    setPlaying(true);
    at(0, () => {
      setIdx(balanced);
      setView("before");
      scrollTo("#dashboard");
    });
    at(2600, () => setView("greenq"));
    at(5200, () => scrollTo("#prio-slider"));
    let t = sweep(6400, balanced, last);
    t = sweep(t + 1300, last, 0);
    t = sweep(t + 1300, 0, balanced);
    at(t + 1200, () => scrollTo("#circuit"));
    at(t + 5200, () => scrollTo("#histogram"));
    at(t + 9200, () => setPlaying(false));
  }, [stop, setIdx, setView, balanced, last]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!playing) return;
    const pause = (e: Event) => {
      if ((e.target as HTMLElement | null)?.closest?.("[data-story-control]")) return;
      stop();
    };
    window.addEventListener("wheel", pause, { passive: true });
    window.addEventListener("keydown", pause);
    window.addEventListener("pointerdown", pause);
    window.addEventListener("touchstart", pause, { passive: true });
    return () => {
      window.removeEventListener("wheel", pause);
      window.removeEventListener("keydown", pause);
      window.removeEventListener("pointerdown", pause);
      window.removeEventListener("touchstart", pause);
    };
  }, [playing, stop]);

  useEffect(() => stop, [stop]);
  return { playing, togglePlay: () => (playing ? stop() : play()) };
}
