import { useEffect, useRef } from "react";

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
};

export async function toggleFullscreen(force?: boolean) {
  try {
    const on = !!document.fullscreenElement;
    if (force === false || (force === undefined && on)) {
      if (on) await document.exitFullscreen();
    } else if (!on) await document.documentElement.requestFullscreen();
  } catch {
    /* fullscreen refused (iframe, browser setting): ignore */
  }
}

/** ← → move, 1–6 jump, P plays the story, T starts the tour, D the Full demo, F full screen, Esc leaves full screen. */
export function useSlideKeys(opts: { count: number; go: (i: number) => void; step: (d: number) => void; togglePlay: () => void; tour?: () => void; demo?: () => void; disabled?: boolean }) {
  const ref = useRef(opts);
  ref.current = opts;
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      const o = ref.current;
      if (o.disabled) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") o.step(1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") o.step(-1);
      else if (/^[1-9]$/.test(e.key) && Number(e.key) <= o.count) o.go(Number(e.key) - 1);
      else if (e.key === "p" || e.key === "P") o.togglePlay();
      else if (e.key === "f" || e.key === "F") void toggleFullscreen();
      else if ((e.key === "t" || e.key === "T") && o.tour) o.tour();
      else if ((e.key === "d" || e.key === "D") && o.demo) o.demo();
      else if (e.key === "Escape") void toggleFullscreen(false);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);
}
