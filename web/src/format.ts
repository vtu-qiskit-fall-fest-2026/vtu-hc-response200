const int = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** 1798.47 -> "1,798" (Indian grouping is identical below 1 lakh). */
export const n0 = (x: number) => int.format(Math.round(x));
export const pct = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`;
export const signed = (x: number, digits = 3) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(digits)}`;
/** Typographic minus for negative numbers. */
export const minus = (x: number) => (x < 0 ? `−${n0(-x)}` : n0(x));

export const priorityLabel = (w: number) => {
  if (w === 0) return "Water only";
  if (w === 1) return "Carbon only";
  if (w === 0.5) return "Balanced";
  return `${Math.round(w * 100)}% carbon · ${Math.round((1 - w) * 100)}% water`;
};

export const shortSite = (label: string) => label.split(" (")[0];

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
