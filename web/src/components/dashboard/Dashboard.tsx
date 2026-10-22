import { useEffect, useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import DraggableWidgetGrid, { type WidgetItem } from "@/components/ui/draggable-widget-grid";
import { SceneWidget } from "./Scene";
import { PriorityWidget, RunsWidget, SavingsWidget } from "./Panels";

type Kind = "priority" | "scene" | "savings" | "runs";
interface Item extends WidgetItem { kind: Kind }

// At 2 columns a "wide" widget is full width: priority, then the scene under it,
// then savings and runs side by side.
const ITEMS: Item[] = [
  { id: "priority", kind: "priority", size: "wide", label: "Priority between water and carbon, with the trade-off curve" },
  { id: "scene", kind: "scene", size: "wide", label: "Two data centres: where each job runs" },
  { id: "savings", kind: "savings", size: "sm", label: "Savings" },
  { id: "runs", kind: "runs", size: "sm", label: "Real IBM hardware runs" },
];

const VIEWS: Record<Kind, () => ReactNode> = {
  priority: PriorityWidget,
  scene: SceneWidget,
  savings: SavingsWidget,
  runs: RunsWidget,
};

/** One column on phones and narrow windows. */
function useColumns() {
  const query = "(max-width: 900px)";
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setNarrow(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return narrow ? 1 : 2;
}

export function Dashboard() {
  const columns = useColumns();
  return (
    <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] ring-1 ring-border">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="size-2.5 rounded-full bg-foreground/15" />
          </span>
          <span className="ml-2 text-[15px] font-semibold">GreenQ planner</span>
        </div>
        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <GripVertical className="size-3.5" aria-hidden="true" /> Drag panels to rearrange
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
          cellSize={420}
          gap={14}
          radius={22}
        />
      </div>
    </div>
  );
}
