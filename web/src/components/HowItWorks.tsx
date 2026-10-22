import type { UiData } from "../types";
import { n0 } from "../format";

/** Four plain-language steps. Step numbers are kept because the order matters. */
export function HowItWorks({ data }: { data: UiData }) {
  const c = data.circuit;
  const invalid = 1 - c.onehot_valid_fraction;
  return (
    <section className="section how" id="how" aria-labelledby="how-title">
      <div className="section__head">
        <h2 id="how-title">How it works</h2>
        <p className="lede">Four steps, from a schedule to a reading on a real quantum computer.</p>
      </div>
      <ol className="steps">
        <li className="step">
          <QubitPairs />
          <h3>Two qubits per job</h3>
          <p>
            Each job gets a <em>where</em> qubit (Site A or B) and a <em>when</em> qubit (day or night). Four jobs need{" "}
            {c.n_qubits} qubits, and every reading is a valid schedule. The textbook encoding needs {c.onehot_qubits} qubits, and{" "}
            {(invalid * 100).toFixed(1)}% of its readings are invalid.
          </p>
        </li>
        <li className="step">
          <TermsGlyph />
          <h3>Cost becomes energy</h3>
          <p>
            The carbon-and-water cost of every schedule is written as a Hamiltonian of {c.hamiltonian_terms} terms. A test checks
            that it gives exactly the classical cost for all {n0(data.instance.n_schedules)} schedules.
          </p>
        </li>
        <li className="step">
          <WaveGlyph />
          <h3>Interference favours cheap schedules</h3>
          <p>
            A QAOA circuit built in Qiskit starts with all {n0(data.instance.n_schedules)} schedules at once and shifts probability
            toward cheap ones. Its two angles are trained on a simulator; one layer runs on hardware.
          </p>
        </li>
        <li className="step">
          <CheckGlyph />
          <h3>Real hardware, checked by brute force</h3>
          <p>
            The trained circuit runs on IBM hardware. Every answer is graded against the true best schedule, found by checking
            all {n0(data.instance.n_schedules)} of them on a laptop.
          </p>
        </li>
      </ol>
    </section>
  );
}

function QubitPairs() {
  return (
    <svg className="step__art" viewBox="0 0 240 64" aria-hidden="true">
      {[0, 1, 2, 3].map((j) => (
        <g key={j} transform={`translate(${j * 60 + 4} 8)`}>
          <rect width="24" height="40" rx="3" className="art-where" />
          <rect x="26" width="24" height="40" rx="3" className="art-when" />
          <text x="12" y="27" textAnchor="middle">W</text>
          <text x="38" y="27" textAnchor="middle">T</text>
        </g>
      ))}
    </svg>
  );
}

function TermsGlyph() {
  return (
    <svg className="step__art" viewBox="0 0 240 64" aria-hidden="true">
      <text x="0" y="40" className="art-eq">H = Σ c · Z Z Z Z</text>
    </svg>
  );
}

function WaveGlyph() {
  return (
    <svg className="step__art" viewBox="0 0 240 64" aria-hidden="true">
      <path d="M2 40 C 30 40, 30 12, 60 12 S 90 52, 120 52 S 150 6, 180 6 S 210 40, 238 40" className="art-wave" />
      <circle cx="180" cy="6" r="5" className="art-dot" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg className="step__art" viewBox="0 0 240 64" aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => (
        <rect key={i} x={i * 15} y={i === 9 ? 6 : 26} width="11" height={i === 9 ? 46 : 26} rx="2" className={i === 9 ? "art-best" : "art-cell"} />
      ))}
    </svg>
  );
}
