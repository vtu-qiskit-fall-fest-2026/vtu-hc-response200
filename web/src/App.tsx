import { useEffect, useMemo, useRef, useState } from "react";
import type { UiData } from "./types";
import { Gauge } from "./components/Gauge";
import { Board } from "./components/Board";
import { PrioritySlider } from "./components/PrioritySlider";
import { Proof } from "./components/Proof";
import { HowItWorks } from "./components/HowItWorks";
import { Footer } from "./components/Footer";
import { ArrowDown, CarbonIcon, ReplayIcon, WaterIcon } from "./components/Icons";
import { n0, pct, prefersReducedMotion, priorityLabel, shortSite } from "./format";

const BALANCED = 10; // sweep index of w = 0.5

export default function App() {
  const [data, setData] = useState<UiData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/data")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  if (error)
    return (
      <main className="state">
        <h1>GreenQ couldn&rsquo;t load its saved results</h1>
        <p>
          The page reads <code>/api/data</code> from the GreenQ server ({error}). Start it from the project folder with{" "}
          <code>python -m server</code>, then reload.
        </p>
      </main>
    );
  if (!data)
    return (
      <main className="state" aria-busy="true">
        <p>Loading saved results…</p>
      </main>
    );
  return <Demo data={data} />;
}

function Demo({ data }: { data: UiData }) {
  const [idx, setIdx] = useState(BALANCED);
  const stop = data.sweep[idx];
  const naive = data.naive;
  const hwStops = data.sweep.map((s, i) => (s.hardware ? i : -1)).filter((i) => i >= 0);
  const proofW = stop.hardware ? stop.w : 0.5;
  const proof = data.proof.find((p) => p.w === stop.w);

  // The GreenQ board first shows business as usual, then the jobs move.
  const boardRef = useRef<HTMLDivElement>(null);
  const [played, setPlayed] = useState(prefersReducedMotion());
  useEffect(() => {
    if (played || !boardRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setTimeout(() => setPlayed(true), 700);
          io.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -35% 0px" },
    );
    io.observe(boardRef.current);
    return () => io.disconnect();
  }, [played]);
  const replay = () => {
    setPlayed(false);
    setTimeout(() => setPlayed(true), 900);
  };
  const shown = played ? stop.best.schedule : naive.schedule;

  const co2Pct = stop.saved_kg_co2 / naive.kg_co2;
  const waterPct = stop.saved_litres / naive.litres;

  const why = useMemo(() => {
    const { jobs, options, sites } = data.instance;
    return jobs
      .map((j, i) => {
        const a = options[naive.schedule[i]];
        const b = options[stop.best.schedule[i]];
        if (a.index === b.index) return null;
        const dCo2 = j.it_energy_kwh * (b.kg_co2_per_kwh - a.kg_co2_per_kwh);
        const dWater = j.it_energy_kwh * (b.litres_per_kwh - a.litres_per_kwh);
        const where = a.site !== b.site ? `to ${shortSite(sites.find((s) => s.key === b.site)!.label)}` : "";
        const when = a.slot !== b.slot ? `to the ${b.slot} slot` : "";
        return { job: j.label, move: [where, when].filter(Boolean).join(", "), dCo2, dWater };
      })
      .filter(Boolean) as { job: string; move: string; dCo2: number; dWater: number }[];
  }, [data, naive.schedule, stop.best.schedule]);

  return (
    <>
      <header className="hero">
        <div className="hero__copy">
          <div className="brand">
            <span className="wordmark">GreenQ</span>
            <span className="brand__team">Team Response200 · VTU Qiskit Fall Fest 2026 · Track 6</span>
          </div>
          <h1>Same jobs, smarter placement.</h1>
          <p className="hero__sub">
            GreenQ picks where and when four flexible data-centre jobs should run. A quantum algorithm built in Qiskit does the
            choosing; a check of all {data.instance.n_schedules} possible schedules confirms the answer.
          </p>
          <div className="readouts">
            <div className="readout readout--carbon">
              <span className="readout__label"><CarbonIcon /> CO₂ saved</span>
              <span className="readout__num">{n0(stop.saved_kg_co2)}<small>kg</small></span>
              <span className="readout__pct">{pct(co2Pct)} less than business as usual</span>
            </div>
            <div className="readout readout--water">
              <span className="readout__label"><WaterIcon /> Water saved</span>
              <span className="readout__num">{n0(stop.saved_litres)}<small>litres</small></span>
              <span className="readout__pct">{pct(waterPct)} less than business as usual</span>
            </div>
          </div>
          <div className="hero__foot">
            <a className="btn btn--primary" href="#board">
              See where the jobs go <ArrowDown />
            </a>
            <span className={`status ${stop.hardware ? "status--hw" : "status--sim"}`}>
              <span className="status__mark" aria-hidden="true" />
              {priorityLabel(stop.w)} priority ·{" "}
              {stop.hardware ? "found on real IBM hardware" : "no hardware run at this setting"}
            </span>
          </div>
        </div>
        <div className="hero__gauges">
          <Gauge tone="carbon" title="kg CO₂" unit="kg" min={3000} max={3800} major={100} naive={naive.kg_co2} value={stop.best.kg_co2} />
          <Gauge tone="water" title="litres of water" unit="L" min={10000} max={13000} major={500} naive={naive.litres} value={stop.best.litres} />
        </div>
      </header>

      <main>
        <section className="section boards" id="board" aria-labelledby="board-title">
          <div className="section__head">
            <h2 id="board-title">Where each job runs</h2>
            <p className="lede">
              Business as usual runs every job at its home site the moment it arrives, so two big jobs pile onto Site A
              overnight on a coal-heavy grid. GreenQ spreads them out to cleaner, drier slots.
            </p>
          </div>

          <PrioritySlider stops={data.sweep} index={idx} onChange={setIdx} />
          <p className={`prio__status ${stop.hardware ? "status--hw" : "status--sim"}`} aria-live="polite">
            {stop.hardware && proof ? (
              <>
                <strong>Real IBM hardware at this setting.</strong> {proof.hardware.length} jobs on{" "}
                <span className="mono">{proof.hardware[0].backend}</span> (
                {proof.hardware.map((h) => (
                  <span className="mono" key={h.job_id}>{h.job_id}</span>
                )).reduce<React.ReactNode[]>((acc, el, i) => (i ? [...acc, ", ", el] : [el]), [])}
                ); the cheapest shot in each was this schedule.
              </>
            ) : (
              <>
                <strong>No hardware run at this setting.</strong> The schedule shown is the best of all{" "}
                {data.instance.n_schedules}, found by checking every one. The nearest hardware stops are{" "}
                {hwStops.map((i) => priorityLabel(data.sweep[i].w).toLowerCase()).join(", ")}.
              </>
            )}
          </p>

          <div className="boards__pair" ref={boardRef}>
            <Board
              data={data}
              variant="naive"
              schedule={naive.schedule}
              title="Business as usual"
              note={`${n0(naive.kg_co2)} kg CO₂ · ${n0(naive.litres)} L water`}
            />
            <Board
              data={data}
              variant="greenq"
              schedule={shown}
              from={played ? naive.schedule : undefined}
              title="GreenQ"
              note={`${n0(stop.best.kg_co2)} kg CO₂ · ${n0(stop.best.litres)} L water`}
            />
          </div>

          <div className="why">
            <div className="why__head">
              <h3>Why this schedule</h3>
              <button className="btn btn--ghost" onClick={replay}>
                <ReplayIcon /> Replay the move
              </button>
            </div>
            <ul>
              {why.map((m) => (
                <li key={m.job}>
                  <strong>{m.job}</strong> moves {m.move}:{" "}
                  <span className="t-carbon">{m.dCo2 > 0 ? "+" : "−"}{n0(Math.abs(m.dCo2))} kg CO₂</span>,{" "}
                  <span className="t-water">{m.dWater > 0 ? "+" : "−"}{n0(Math.abs(m.dWater))} L</span> on its own.
                </li>
              ))}
              {why.some((m) => m.dCo2 > 0 || m.dWater > 0) && (
                <li>Some moves cost a little on their own; they free a cleaner slot for a bigger job.</li>
              )}
              {new Set(stop.best.schedule).size === stop.best.schedule.length && (
                <li>No site is left overloaded: each job gets a site and slot of its own.</li>
              )}
            </ul>
          </div>
        </section>

        <Proof data={data} w={proofW} onSelect={(w) => setIdx(data.sweep.findIndex((s) => s.w === w))} />
        <HowItWorks data={data} />
      </main>
      <Footer data={data} />
    </>
  );
}
