import type { UiData } from "../types";

export function Footer({ data }: { data: UiData }) {
  return (
    <footer className="foot" aria-labelledby="foot-title">
      <h2 id="foot-title" className="foot__claim">
        No quantum advantage is claimed. At this size a laptop checks all {data.instance.n_schedules} schedules instantly, and we
        use it as the referee.
      </h2>
      <div className="foot__cols">
        <div>
          <h3>Measured or cited</h3>
          <ul>
            {data.sources.cited.map((c) => (
              <li key={c.figure}>
                <strong>{c.value}</strong> {c.figure}
              </li>
            ))}
            <li>
              <strong>{data.totals.hardware_jobs} hardware jobs</strong> on IBM Quantum, with job IDs and every shot saved in the repository
            </li>
          </ul>
        </div>
        <div>
          <h3>Illustrative, chosen within published ranges</h3>
          <ul>
            {data.sources.illustrative.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="foot__note">All kg and litre figures on this page come from this illustrative instance, not from a real data centre.</p>
        </div>
        <div>
          <h3>Sources</h3>
          <ol className="foot__refs">
            {data.sources.references.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </div>
      </div>
      <div className="foot__team">
        <span className="wordmark wordmark--small">GreenQ</span>
        <span>Team Response200 · VTU-QFF-HC-0137 · VTU Qiskit Fall Fest 2026 · Track 6: Climate Change &amp; Sustainability</span>
        <a href="https://github.com/vtu-qiskit-fall-fest-2026/vtu-hc-response200">Source code and results</a>
        <span className="foot__fine">Built with Qiskit. Not affiliated with or endorsed by IBM. Data generated {data.generated_utc.slice(0, 10)}.</span>
      </div>
    </footer>
  );
}
