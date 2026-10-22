import { createContext, useContext, useEffect, useState } from "react";
import type { ProofEntry, SweepStop, UiData } from "../types";

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

export interface DashState {
  data: UiData;
  idx: number;
  setIdx: (i: number) => void;
  stop: SweepStop;
  proof: ProofEntry; // hardware entry for this stop, or the balanced one
  onHardware: boolean;
}

export const DashContext = createContext<DashState | null>(null);
export const useDash = () => {
  const v = useContext(DashContext);
  if (!v) throw new Error("useDash outside DashContext");
  return v;
};

export const BALANCED = 10; // sweep index of w = 0.5

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
