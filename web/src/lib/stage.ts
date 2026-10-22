import { useEffect, useState } from "react";

/** The slide canvas. Every screen is laid out for this size, then scaled. */
export const DESIGN_W = 1600;
export const DESIGN_H = 900;
/** Below this width (phones, small windows) we stop scaling and let screens scroll. */
export const MIN_SCALED_W = 1000;

export const isCompact = () => typeof window !== "undefined" && window.innerWidth < MIN_SCALED_W;

/**
 * Scales the whole app by setting the root font size; the built CSS is in rem
 * (vite.config.ts), so 1920×1080 and 1366×768 show exactly the same layout.
 */
export function useStageScale() {
  useEffect(() => {
    const root = document.documentElement;
    const fit = () => {
      const s = isCompact() ? 1 : Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
      root.style.fontSize = `${(16 * s).toFixed(3)}px`;
      root.dataset.compact = isCompact() ? "1" : "0";
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
}

/** True on phones and small windows (no scaling; screens stack and scroll). */
export function useCompact() {
  const [c, setC] = useState(isCompact);
  useEffect(() => {
    const on = () => setC(isCompact());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return c;
}
