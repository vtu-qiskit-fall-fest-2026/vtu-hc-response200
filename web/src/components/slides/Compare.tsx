import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Droplet, Leaf } from "lucide-react";
import { useApp } from "@/lib/data";
import { pct, prefersReducedMotion } from "@/format";
import { MethodsPanel } from "@/components/proof/Methods";
import { ScalingPanel } from "@/components/proof/Scaling";
import { CitiesPanel } from "@/components/proof/Cities";
import { ForecastPanel } from "@/components/proof/Robustness";
import { FlexCurve, RuleStatsLine } from "@/components/dashboard/Panels";
import { RULE_ICON } from "@/components/dashboard/Scene";
import type { Rule } from "@/types";
import { Badge, Card, Screen, Segmented } from "./ui";

type Tab = "methods" | "scaling" | "rules" | "cities" | "forecasts";
const TABS: { value: Tab; label: string }[] = [
  { value: "methods", label: "Methods" },
  { value: "scaling", label: "Scaling" },
  { value: "rules", label: "Job rules" },
  { value: "cities", label: "Cities" },
  { value: "forecasts", label: "Forecasts" },
];

/** Feature 2: what happens when jobs aren't fully flexible. */
function RulesPanel() {
  const { data, preset, setPreset } = useApp();
  const reduced = prefersReducedMotion();
  return (
    <div className="grid h-full grid-cols-[1.1fr_1fr] gap-5">
      <div className="flex min-h-0 flex-col gap-4">
        <p className="flex items-center gap-2 text-[16px] font-semibold">
          Fewer flexible jobs, smaller savings. <Badge kind="illustrative" />
        </p>
        <div className="min-h-0 flex-1 [&_figure]:h-full [&_svg]:h-[calc(100%-3rem)]"><FlexCurve /></div>
      </div>
      <div className="flex min-h-0 flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <Segmented label="Job rules" value={preset.key} onChange={setPreset} options={data.flex.presets.map((p) => ({ value: p.key, label: p.label }))} />
          <span className="flex items-center gap-3 text-[13px] text-muted-foreground">
            {(Object.keys(RULE_ICON) as Rule[]).map((r) => {
              const { Icon, label } = RULE_ICON[r];
              return <span key={r} className="flex items-center gap-1" title={label}><Icon className="size-4" aria-hidden="true" />{r}</span>;
            })}
          </span>
        </div>
        <ul className="space-y-2.5">
          {data.flex.presets.map((p, i) => {
            const s = p.sweep.find((x) => x.w === 0.5)!;
            const co2 = s.saved_kg_co2 / data.naive.kg_co2, water = s.saved_litres / data.naive.litres;
            const on = p.key === preset.key;
            return (
              <li key={p.key} className={`rounded-2xl p-3.5 ${on ? "bg-white ring-2 ring-foreground/20" : "bg-muted/50"}`}>
                <p className="flex items-baseline justify-between text-[15px] font-semibold">{p.label}<span className="text-[13px] font-normal text-muted-foreground">{p.allowed_schedules} allowed schedules</span></p>
                {[{ v: co2, cls: "bg-carbon", Icon: Leaf, t: "text-carbon" }, { v: water, cls: "bg-water", Icon: Droplet, t: "text-water" }].map((b, k) => (
                  <div key={k} className="mt-2 flex items-center gap-2">
                    <b.Icon className={`size-4 ${b.t}`} aria-hidden="true" />
                    <span className="h-2.5 flex-1 rounded-full bg-muted">
                      <motion.span className={`block h-full rounded-full ${b.cls}`} initial={{ width: reduced ? `${(b.v / 0.2) * 100}%` : 0 }} animate={{ width: `${Math.min(1, b.v / 0.2) * 100}%` }} transition={{ duration: 0.7, delay: 0.1 + i * 0.12 + k * 0.06 }} />
                    </span>
                    <span className="w-12 text-right text-[14px] font-semibold tabular-nums">{pct(b.v)}</span>
                  </div>
                ))}
              </li>
            );
          })}
        </ul>
        {preset.qaoa && <RuleStatsLine />}
      </div>
    </div>
  );
}

export function CompareScreen() {
  const { flash } = useApp();
  const [tab, setTab] = useState<Tab>(() => (TABS.some((t) => t.value === flash) ? (flash as Tab) : "methods"));
  // "Show me" from the Ask screen opens the right tab.
  useEffect(() => {
    if (flash && TABS.some((t) => t.value === flash)) setTab(flash as Tab);
  }, [flash]);
  const reduced = prefersReducedMotion();
  const panel: Record<Tab, () => React.ReactNode> = {
    methods: MethodsPanel, scaling: ScalingPanel, rules: RulesPanel, cities: CitiesPanel, forecasts: ForecastPanel,
  };
  const View = panel[tab];
  return (
    <Screen
      title="Fair checks, honest limits."
      info="Every method is graded on the same objective against the exhaustive best. Scaling numbers are measured, not extrapolated."
      right={<Segmented label="Comparison" value={tab} onChange={setTab} options={TABS} size="lg" />}
    >
      <Card id={tab} className={`h-full overflow-hidden ${tab === "methods" ? "" : "p-6"}`}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} className="h-full" initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <View />
          </motion.div>
        </AnimatePresence>
      </Card>
    </Screen>
  );
}
