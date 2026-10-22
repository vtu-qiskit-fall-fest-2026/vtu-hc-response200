import type { SweepStop } from "../types";
import { CarbonIcon, WaterIcon } from "./Icons";
import { priorityLabel } from "../format";

interface Props {
  stops: SweepStop[];
  index: number;
  onChange: (i: number) => void;
}

/**
 * The priority control drawn as a horizontal gauge staff. Stops that ran on
 * real IBM hardware are solid and badged; every other stop is hatched.
 */
export function PrioritySlider({ stops, index, onChange }: Props) {
  const last = stops.length - 1;
  return (
    <div className="prio">
      <div className="prio__ends">
        <span className="prio__end t-water">
          <WaterIcon /> Save water
        </span>
        <output className="prio__value" htmlFor="priority">
          {priorityLabel(stops[index].w)}
        </output>
        <span className="prio__end t-carbon">
          Cut carbon <CarbonIcon />
        </span>
      </div>
      <div className="prio__track" style={{ "--stops": last } as React.CSSProperties}>
        <div className="prio__staff" aria-hidden="true">
          {stops.map((s, i) => (
            <span
              key={s.w}
              className={`tick${s.hardware ? " tick--hw" : ""}${i === index ? " tick--on" : ""}`}
              style={{ "--i": i } as React.CSSProperties}
            >
              {s.hardware && (
                <span className="tick__badge">
                  <span className="tick__long">Real IBM hardware</span>
                  <span className="tick__short">IBM</span>
                </span>
              )}
            </span>
          ))}
        </div>
        <input
          id="priority"
          type="range"
          min={0}
          max={last}
          step={1}
          value={index}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuetext={`${priorityLabel(stops[index].w)}${stops[index].hardware ? ", run on real IBM hardware" : ""}`}
          aria-label="Priority between saving water and cutting carbon"
        />
      </div>
      <div className="prio__legend">
        <span><span className="swatch swatch--solid" /> ran on real IBM hardware (ibm_marrakesh)</span>
        <span><span className="swatch swatch--hatched" /> no hardware run at this setting: best of all 256 schedules, by checking every one</span>
      </div>
    </div>
  );
}
