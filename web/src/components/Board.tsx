import { LayoutGroup, motion } from "motion/react";
import type { UiData } from "../types";
import { n0, prefersReducedMotion, shortSite } from "../format";

interface Props {
  data: UiData;
  schedule: number[];
  variant: "naive" | "greenq";
  title: string;
  note: string;
  /** naive schedule, used to mark which jobs GreenQ moved */
  from?: number[];
}

const MAX_KWH = 1200;

/** Sites x time slots as concrete sluice bays; each job is a block sized by its energy. */
export function Board({ data, schedule, variant, title, note, from }: Props) {
  const { sites, slots, jobs, options } = data.instance;
  const bayOf = (s: string, t: string) => options.find((o) => o.site === s && o.slot === t)!.index;
  const reduced = prefersReducedMotion();

  return (
    <LayoutGroup id={variant}>
      <div className={`board board--${variant}`}>
        <div className="board__head">
          <h3>{title}</h3>
          <p>{note}</p>
        </div>
        <div className="board__grid" role="table" aria-label={`${title} schedule`}>
          <div role="row" className="board__row board__row--head">
            <div role="columnheader" className="board__corner" />
            {slots.map((t) => (
              <div role="columnheader" key={t.key} className="board__slot">
                <strong>{t.label.split(" (")[0]}</strong>
                <span>{t.label.match(/\((.*)\)/)?.[1]}</span>
              </div>
            ))}
          </div>
          {sites.map((s) => (
            <div role="row" className="board__row" key={s.key}>
              <div role="rowheader" className="board__site">
                <strong>{shortSite(s.label)}</strong>
                <span>{s.cooling === "evaporative" ? "Evaporative cooling" : "Air-cooled chillers"}</span>
              </div>
              {slots.map((t) => {
                const k = bayOf(s.key, t.key);
                const here = jobs.map((_, j) => j).filter((j) => schedule[j] === k);
                const opt = options[k];
                const over = here.length > 1;
                return (
                  <div role="cell" key={t.key} className={`bay${over ? " bay--over" : ""}`}>
                    <div className="bay__jobs">
                      {here.map((j) => {
                        const moved = from && from[j] !== k;
                        const fromOpt = from ? options[from[j]] : undefined;
                        return (
                          <motion.div
                            key={jobs[j].key}
                            layoutId={`${variant}-${jobs[j].key}`}
                            transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 22, mass: 0.9 }}
                            className={`job${moved ? " job--moved" : ""}`}
                            style={{ "--size": jobs[j].it_energy_kwh / MAX_KWH } as React.CSSProperties}
                          >
                            <span className="job__name">{jobs[j].label}</span>
                            <span className="job__kwh">{n0(jobs[j].it_energy_kwh)} kWh</span>
                            {moved && fromOpt && (
                              <span className="job__from">
                                was {shortSite(sites.find((x) => x.key === fromOpt.site)!.label)}, {fromOpt.slot}
                              </span>
                            )}
                          </motion.div>
                        );
                      })}
                      {here.length === 0 && <span className="bay__idle">idle</span>}
                    </div>
                    {over && <div className="bay__warn">Overloaded: {here.length} jobs share its spare capacity</div>}
                    <div className="bay__unit">
                      <span className="t-carbon">{opt.kg_co2_per_kwh.toFixed(2)} kg</span>
                      <span className="t-water">{opt.litres_per_kwh.toFixed(1)} L</span>
                      <span>per kWh</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </LayoutGroup>
  );
}
