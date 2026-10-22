import { useEffect, useMemo, useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import DraggableWidgetGrid, { type WidgetItem } from "@/components/ui/draggable-widget-grid";
import { BALANCED, DashContext, type DashState } from "@/lib/data";
import type { UiData } from "@/types";
import {
  BestWidget,
  CarbonWidget,
  MitigationWidget,
  PriorityWidget,
  ProofWidget,
  QubitsWidget,
  RefereeWidget,
  RunsWidget,
  ScheduleWidget,
  WaterWidget,
} from "./Widgets";

type Kind = "carbon" | "water" | "priority" | "schedule" | "proof" | "runs" | "qubits" | "best" | "mitigation" | "referee";
interface Item extends WidgetItem { kind: Kind }

// Areas tile exactly into 4 columns: 1+1+2 | 4 (lg) + 2 + 2 | 1+1+1+1.
const ITEMS: Item[] = [
  { id: "carbon", kind: "carbon", size: "sm", label: "CO2 saved" },
  { id: "water", kind: "water", size: "sm", label: "Water saved" },
  { id: "priority", kind: "priority", size: "wide", label: "Priority between water and carbon" },
  { id: "schedule", kind: "schedule", size: "lg", label: "Where each job runs" },
  { id: "proof", kind: "proof", size: "wide", label: "Quantum computer versus random guessing" },
  { id: "runs", kind: "runs", size: "wide", label: "IBM hardware runs" },
  { id: "qubits", kind: "qubits", size: "sm", label: "Qubits used" },
  { id: "best", kind: "best", size: "sm", label: "Best schedule" },
  { id: "mitigation", kind: "mitigation", size: "sm", label: "Error mitigation" },
  { id: "referee", kind: "referee", size: "sm", label: "The referee" },
];

const VIEWS: Record<Kind, () => ReactNode> = {
  carbon: CarbonWidget,
  water: WaterWidget,
  priority: PriorityWidget,
  schedule: ScheduleWidget,
  proof: ProofWidget,
  runs: RunsWidget,
  qubits: QubitsWidget,
  best: BestWidget,
  mitigation: MitigationWidget,
  referee: RefereeWidget,
};

/** One column on phones, so every widget has room for its text. */
function useColumns() {
  const query = "(max-width: 640px)";
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setNarrow(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return narrow ? 1 : 4;
}

export function Dashboard({ data }: { data: UiData }) {
  const [idx, setIdx] = useState(BALANCED);
  const columns = useColumns();
  const value: DashState = useMemo(() => {
    const stop = data.sweep[idx];
    const hw = data.proof.find((p) => p.w === stop.w);
    return { data, idx, setIdx, stop, proof: hw ?? data.proof.find((p) => p.w === 0.5)!, onHardware: !!hw };
  }, [data, idx]);

  return (
    <DashContext.Provider value={value}>
      <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] ring-1 ring-border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex gap-1.5" aria-hidden="true">
              <span className="size-2.5 rounded-full bg-foreground/15" />
              <span className="size-2.5 rounded-full bg-foreground/15" />
              <span className="size-2.5 rounded-full bg-foreground/15" />
            </span>
            <span className="ml-2 text-[15px] font-semibold">Overview</span>
          </div>
          <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <GripVertical className="size-3.5" aria-hidden="true" /> Drag widgets to rearrange · illustrative data
          </span>
        </div>
        <div className="bg-muted/60 p-3 sm:p-4">
          <DraggableWidgetGrid
            key={columns}
            items={ITEMS}
            renderItem={(item) => {
              const View = VIEWS[(item as Item).kind];
              return <View />;
            }}
            maxColumns={columns}
            cellSize={250}
            gap={12}
            radius={20}
          />
        </div>
      </div>
    </DashContext.Provider>
  );
}
