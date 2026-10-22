import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useId } from "react";
import { n0, prefersReducedMotion } from "../format";

interface Props {
  tone: "carbon" | "water";
  title: string;
  unit: string;
  min: number;
  max: number;
  major: number;
  naive: number;
  value: number;
}

// Geometry of the painted staff (SVG user units).
const W = 230;
const H = 880;
const TOP = 40;
const BOTTOM = H - 70;
const STAFF_X = 92;
const STAFF_W = 66;

/**
 * A river staff gauge: alternating "E" marks every major step, stencil numerals,
 * a business-as-usual mark, and a level that draws down to the GreenQ value.
 * The visible window (min..max) does not start at zero; the caption says so.
 */
export function Gauge({ tone, title, unit, min, max, major, naive, value }: Props) {
  const uid = useId().replace(/:/g, "");
  const y = (v: number) => TOP + ((max - v) / (max - min)) * (BOTTOM - TOP);
  const level = useMotionValue(naive);
  const levelY = useTransform(level, (v) => y(v));
  const fillH = useTransform(level, (v) => BOTTOM - y(v));
  const hatchH = useTransform(level, (v) => Math.max(0, y(v) - y(naive)));
  const readout = useTransform(level, (v) => n0(v));
  const savedText = useTransform(level, (v) => `−${n0(naive - v)}`);
  const savedY = useTransform(level, (v) => (y(v) + y(naive)) / 2 + 8);

  useEffect(() => {
    if (prefersReducedMotion()) {
      level.set(value);
      return;
    }
    const first = level.get() === naive;
    const c = animate(level, value, { duration: first ? 2.2 : 0.9, delay: first ? 0.6 : 0, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [value, naive, level]);

  const marks: number[] = [];
  for (let v = Math.ceil(min / major) * major; v < max; v += major) marks.push(v);
  const half = major / 2;
  const halves: number[] = [];
  for (let v = Math.ceil(min / half) * half; v < max; v += half) halves.push(v);
  const tooth = (major / 10) * ((BOTTOM - TOP) / (max - min));
  const color = `var(--${tone})`;

  return (
    <figure className={`gauge gauge--${tone}`} aria-label={`${title}: business as usual ${n0(naive)} ${unit}, GreenQ ${n0(value)} ${unit}`}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-hidden="true">
        <defs>
          <pattern id={`hatch-${uid}`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="10" height="10" fill="transparent" />
            <line x1="0" y1="0" x2="0" y2="10" stroke={color} strokeWidth="3" strokeOpacity="0.55" />
          </pattern>
          <linearGradient id={`well-${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.26" />
            <stop offset="1" stopColor={color} stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {/* stilling well behind the staff */}
        <rect x="18" y={TOP - 18} width={W - 36} height={BOTTOM - TOP + 36} className="gauge__well" />
        <motion.rect x="18" width={W - 36} y={levelY} height={fillH} fill={`url(#well-${uid})`} />

        {/* enamel staff plate: a continuous ladder of E marks, alternating sides every half step */}
        <rect x={STAFF_X} y={TOP - 10} width={STAFF_W} height={BOTTOM - TOP + 20} className="gauge__staff" />
        {halves.map((v, i) => {
          const left = i % 2 === 0;
          const x0 = left ? STAFF_X + 5 : STAFF_X + STAFF_W / 2;
          const w = STAFF_W / 2 - 5;
          const spineX = left ? x0 : x0 + w - 7;
          const yb = y(v);
          return (
            <g key={v} className={`gauge__e gauge__e--${tone}`}>
              <rect x={spineX} y={yb - tooth * 5} width={7} height={tooth * 5} />
              {[0, 2, 4].map((t) => (
                <rect key={t} x={x0} y={yb - tooth * (t + 1)} width={w} height={tooth} />
              ))}
            </g>
          );
        })}

        {/* business-as-usual mark */}
        <line x1="10" x2={W - 10} y1={y(naive)} y2={y(naive)} className="gauge__naive" />
        <g transform={`translate(10 ${y(naive) - 30})`} className="gauge__tag">
          <rect width="172" height="24" rx="2" />
          <text x="8" y="17">BUSINESS AS USUAL</text>
        </g>

        {/* saved span between the marks */}
        <motion.rect x="18" width={W - 36} y={y(naive)} height={hatchH} fill={`url(#hatch-${uid})`} />
        <motion.text x={STAFF_X + STAFF_W / 2} y={savedY} textAnchor="middle" className="gauge__saved">
          {savedText}
        </motion.text>

        {/* GreenQ level */}
        <motion.rect x="18" width={W - 36} y={levelY} height={10} fill={color} fillOpacity={0.28} />
        <motion.line x1="10" x2={W - 10} y1={levelY} y2={levelY} className="gauge__level" stroke={color} />
        {/* numerals last, so their halo sits above the level lines */}
        {marks.map((v, i) => (
          <text
            key={v}
            x={i % 2 === 0 ? STAFF_X - 10 : STAFF_X + STAFF_W + 10}
            y={y(v) + 9}
            textAnchor={i % 2 === 0 ? "end" : "start"}
            className="gauge__num"
          >
            {n0(v)}
          </text>
        ))}
      </svg>
      <figcaption>
        <span className="gauge__title">{title}</span>
        <span className="gauge__legend">
          <span className="key key--naive" /> business as usual {n0(naive)}
        </span>
        <span className="gauge__legend">
          <span className={`key key--${tone}`} /> GreenQ <motion.span>{readout}</motion.span>
        </span>
        <span className="gauge__scale">scale {n0(min)}–{n0(max)} {unit}, not from zero</span>
      </figcaption>
    </figure>
  );
}
