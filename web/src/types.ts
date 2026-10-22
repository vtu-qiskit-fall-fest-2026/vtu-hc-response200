// Shape of results/ui_data.json (written by scripts/export_ui_data.py).

export interface Site { key: string; label: string; cooling: string; pue: number; wue: Record<string, number> }
export interface Slot { key: string; label: string; carbon_kg_per_kwh: number; grid_water_l_per_kwh: number }
export interface Job { key: string; label: string; it_energy_kwh: number; home_site: string; submitted_slot: string }
export interface Option { index: number; site: string; slot: string; kg_co2_per_kwh: number; litres_per_kwh: number }
export interface Footprint { schedule: number[]; kg_co2: number; litres: number }

export interface SweepStop {
  w: number;
  best: Footprint;
  saved_kg_co2: number;
  saved_litres: number;
  hardware: boolean;
}

export interface RunSummary {
  shots: number;
  approx_ratio: number;
  approx_ratio_se: number;
  z_vs_random: number;
  share_best10: number;
  optimum_hits: number;
  found_optimum: boolean;
  optimum_frequency_rank: number | null;
  best_sampled_schedule: number[];
  deciles: number[];
}

export interface HardwareRun extends RunSummary {
  backend: string;
  job_id: string;
  mitigation: "none" | "dd_twirl";
  completed_utc: string | null;
  quantum_seconds: number | null;
  two_qubit_gates: number;
  depth: number;
  physical_qubits: number[] | null;
}

export interface Gate {
  kind: "h" | "rz" | "zz" | "zzzz" | "rx" | "measure";
  qubits: number[];
  angle: number | null;
}

export interface ProofEntry {
  w: number;
  circuit_gates: Gate[];
  random: { approx_ratio: number; share_best10: number; expected_optimum_hits: number; deciles: number[] };
  hardware: HardwareRun[];
  ideal?: RunSummary;
  noisy?: RunSummary & { backend: string };
  qaoa?: { gammas: number[]; betas: number[] };
}

export interface UiData {
  generated_utc: string;
  instance: {
    sites: Site[];
    slots: Slot[];
    jobs: Job[];
    options: Option[];
    congestion_fraction: number;
    slot_note: string;
    n_schedules: number;
  };
  naive: Footprint;
  sweep: SweepStop[];
  proof: ProofEntry[];
  circuit: {
    n_qubits: number;
    hamiltonian_terms: number;
    onehot_qubits: number;
    onehot_valid_fraction: number;
    onehot_two_qubit_gates_estimate: number;
    reps_on_hardware: number;
    qubit_meaning: { qubit: number; job: string; bit: "when" | "where" }[];
  };
  totals: { hardware_jobs: number; quantum_seconds: number };
  methods: {
    instance: string;
    runtimes: string;
    weights: { w: number; rows: MethodRow[] }[];
  } | null;
  sources: { cited: { figure: string; value: string; source: string }[]; illustrative: string[]; references: string[] };
}

export interface SimResult {
  w: number;
  shots: number;
  target: string;
  approx_ratio: number;
  approx_ratio_random: number;
  share_best10: number;
  optimum_hits: number;
  found_optimum: boolean;
  schedule: number[];
  optimal_schedule: number[];
  kg_co2: number;
  litres: number;
}

export interface MethodRow {
  method: string;
  kind: "baseline" | "classical" | "quantum-sim" | "quantum-hw" | "referee";
  objective: number;
  gap_pct: number;
  kg_co2: number;
  litres: number;
  schedule: number[];
  runtime_ms: number | null;
  note: string;
}
