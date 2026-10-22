import { createContext, useContext, useEffect, useState } from "react";
import type { FlexPreset, ProofEntry, SweepStop, UiData } from "../types";
import type { CaptionId } from "./story";

/** Loads results/ui_data.json through the FastAPI server. */
export function useUiData() {
  const [data, setData] = useState<UiData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/data")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);
  return { data, error };
}

export type View = "before" | "greenq";

/** Shared page state: the priority stop, the before/after toggle, story mode. */
export interface AppState {
  data: UiData;
  idx: number;
  setIdx: (i: number) => void;
  view: View;
  setView: (v: View) => void;
  preset: FlexPreset;          // Feature 2: which job rules apply
  setPreset: (k: FlexPreset["key"]) => void;
  sweep: SweepStop[];          // best schedule per priority stop, for this preset
  stop: SweepStop;
  proof: ProofEntry; // hardware entry for this stop, or the balanced one
  onHardware: boolean;
  playing: boolean;
  togglePlay: () => void;
  screen: number;              // slide index (lib/screens.ts)
  go: (i: number) => void;
  caption: CaptionId | null;   // story-mode caption on screen
  flash: string | null;        // a widget id to highlight once (Ask -> "show me")
  show: (screen: number, widget: string) => void;
}

export const AppContext = createContext<AppState | null>(null);
export const useApp = () => {
  const v = useContext(AppContext);
  if (!v) throw new Error("useApp outside AppContext");
  return v;
};

export const BALANCED = 10; // sweep index of w = 0.5

/** Plain words for the two schedules. */
export const VIEW_LABEL: Record<View, string> = { before: "Run now", greenq: "Run smart" };

/** Mitigated minus raw approximation ratio, per hardware setting. */
export const mitigationDeltas = (data: UiData) =>
  data.proof.map((p) => {
    const raw = p.hardware.find((h) => h.mitigation === "none")!;
    const mit = p.hardware.find((h) => h.mitigation === "dd_twirl")!;
    return mit.approx_ratio - raw.approx_ratio;
  });

export const hardwareShareRange = (data: UiData) => {
  const all = data.proof.flatMap((p) => p.hardware.map((h) => h.share_best10));
  return [Math.min(...all), Math.max(...all)] as const;
};

export const signed3 = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(3)}`;

export const JOB_STYLE = [
  { short: "ML training", cls: "bg-violet-500", text: "text-white" },
  { short: "Genomics", cls: "bg-amber-400", text: "text-amber-950" },
  { short: "Analytics", cls: "bg-pink-500", text: "text-white" },
  { short: "Video", cls: "bg-slate-700", text: "text-white" },
];

/** Short plain-language reasons for each moved job, derived from the options table.
 *  The server's template fallback (server/llm.py) mirrors this. */
export function whyLines(data: UiData, from: number[], to: number[]) {
  const { jobs, options, sites, slots } = data.instance;
  const siteOf = (k: string) => sites.find((s) => s.key === k)!;
  const slotOf = (k: string) => slots.find((s) => s.key === k)!;
  const crowded = (sched: number[], k: number) => sched.filter((x) => x === k).length > 1;
  const out: { job: number; text: string }[] = [];
  jobs.forEach((j, i) => {
    if (from[i] === to[i]) return;
    const a = options[from[i]];
    const b = options[to[i]];
    const sa = siteOf(a.site), sb = siteOf(b.site);
    const where = `${sb.label.split(" (")[0]}, ${b.slot}`;
    const reasons: string[] = [];
    if (slotOf(b.slot).carbon_kg_per_kwh < slotOf(a.slot).carbon_kg_per_kwh) reasons.push(`cleaner ${b.slot} grid`);
    if (sb.wue[b.slot] < sa.wue[a.slot]) reasons.push(sb.cooling === "air-cooled" ? "air cooling saves water" : `less cooling water at ${b.slot}`);
    if (sb.pue < sa.pue) reasons.push("less cooling power");
    if (crowded(from, from[i]) && !crowded(to, to[i])) reasons.push("leaves a crowded slot");
    if (b.kg_co2_per_kwh > a.kg_co2_per_kwh && b.litres_per_kwh > a.litres_per_kwh && reasons.length === 0) reasons.push("makes room for a bigger job");
    if (reasons.length === 0) reasons.push("balances carbon and water");
    out.push({ job: i, text: `${j.label} → ${where}: ${reasons.slice(0, 2).join(", ")}.` });
  });
  return out;
}
