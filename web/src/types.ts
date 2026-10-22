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
  flex: {
    presets: FlexPreset[];
    curve: { flexible_share: number; subsets: number; co2_saved_pct: number; water_saved_pct: number }[];
    note: string;
  };
  scaling: Scaling | null;
  cities: Cities | null;
  robustness: Robustness | null;
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

export type Rule = "deadline" | "residency" | "priority";

export interface RuleStats {
  shots: number;
  allowed_schedules: number;
  share_obeying_rules: number;
  share_obeying_rules_random: number;
  share_best10_allowed: number;
  share_best10_allowed_random: number;
  optimum_hits: number;
  found_optimum: boolean;
  best_sampled_schedule: number[] | null;
}

export interface FlexPreset {
  key: "flexible" | "mixed" | "rigid";
  label: string;
  rules: Record<string, Rule[]>;
  allowed_schedules: number;
  sweep: SweepStop[];
  qaoa?: { ideal: RuleStats; noisy?: RuleStats; hardware?: RuleStats & { backend: string; job_id: string; quantum_seconds: number | null } };
}

export interface ScalingRow {
  jobs: number;
  qubits: number;
  schedules: number;
  hamiltonian_terms: number;
  two_qubit_gates: number;
  depth: number;
  qaoa_ideal: { approx_ratio: number; p_optimal: number; share_best10: number; train_ms: number };
  qaoa_noisy?: { approx_ratio: number; share_best10: number; p_optimal: number; found_optimum: boolean };
  random: { approx_ratio: number; p_optimal: number; share_best10: number };
  exhaustive_ms: number;
  classical: { greedy: { gap_pct: number; ms: number }; annealing: { gap_pct: number; ms: number }; random_4000: { gap_pct: number; ms: number } };
}

export interface Scaling {
  weight: number;
  backend_layout: string;
  note: string;
  sizes: ScalingRow[];
}

export interface CitySite { city: string; state: string; score: number; label: string; multiplier: number }
export interface CityPreset {
  key: string;
  label: string;
  sites: { evap: CitySite; air: CitySite };
  grid_multiplier: number;
  naive: { kg_co2: number; weighted_litres: number; litres: number };
  sweep: { w: number; schedule: number[]; kg_co2: number; weighted_litres: number; litres: number; same_as_unweighted: boolean }[];
  qaoa_sim_balanced: { share_best10: number; approx_ratio: number; found_optimum: boolean; optimum_hits: number };
}
export interface Cities { source: string; mapping: string; india: { score: number; label: string }; presets: CityPreset[] }

export interface RobustnessStudy {
  error_pct: number; w: number; draws: number; seed: number;
  within_5pct: number; still_best: number; worst_regret_pct: number; mean_regret_pct: number;
  histogram: { label: string; share: number }[];
}
export interface Robustness { note: string; studies: RobustnessStudy[] }
