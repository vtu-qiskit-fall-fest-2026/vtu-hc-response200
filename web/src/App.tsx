import { useMemo, useState } from "react";
import { AppContext, BALANCED, useUiData, type AppState, type View } from "@/lib/data";
import { useStory } from "@/lib/story";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { QuantumProof } from "@/components/proof/Proof";
import { MethodsCompared } from "@/components/proof/Methods";
import { HowItScales } from "@/components/proof/Scaling";
import { Cities } from "@/components/proof/Cities";
import { TryIt } from "@/components/proof/TryIt";
import { Robustness } from "@/components/proof/Robustness";
import { DashboardBand, Faq, Footer, Hero, HowItWorks, Nav } from "@/components/site/Site";
import type { FlexPreset, UiData } from "@/types";

export default function App() {
  const { data, error } = useUiData();

  if (error)
    return (
      <main className="grid min-h-screen place-content-center gap-3 p-6 text-center">
        <h1 className="text-2xl font-semibold">GreenQ couldn&rsquo;t load its saved results</h1>
        <p className="text-muted-foreground">
          Start the server from the project folder with <code className="font-mono">python -m server</code>, then reload. ({error})
        </p>
      </main>
    );
  if (!data)
    return (
      <main className="grid min-h-screen place-content-center text-muted-foreground" aria-busy="true">
        Loading…
      </main>
    );
  return <Page data={data} />;
}

function Page({ data }: { data: UiData }) {
  const [idx, setIdx] = useState(BALANCED);
  const [view, setView] = useState<View>("before");
  const [presetKey, setPreset] = useState<FlexPreset["key"]>("flexible");
  const { playing, togglePlay } = useStory(setIdx, setView, BALANCED, data.sweep.length - 1);

  const value: AppState = useMemo(() => {
    const preset = data.flex.presets.find((p) => p.key === presetKey) ?? data.flex.presets[0];
    const sweep = preset.sweep;
    const stop = sweep[idx];
    // The proof section is about the all-flexible instance's hardware runs.
    const hw = data.proof.find((p) => p.w === stop.w);
    return {
      data, idx, setIdx, view, setView, preset, setPreset, sweep, stop,
      proof: hw ?? data.proof.find((p) => p.w === 0.5)!,
      onHardware: stop.hardware, playing, togglePlay,
    };
  }, [data, idx, view, presetKey, playing, togglePlay]);

  return (
    <AppContext.Provider value={value}>
      <Nav />
      <main>
        <Hero />
        <DashboardBand>
          <Dashboard />
        </DashboardBand>
        <Cities />
        <Robustness />
        <QuantumProof />
        <MethodsCompared />
        <HowItScales />
        <TryIt />
        <HowItWorks />
        <Faq />
      </main>
      <Footer />
    </AppContext.Provider>
  );
}
