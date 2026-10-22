import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppContext, BALANCED, useUiData, type AppState, type View } from "@/lib/data";
import { useStory, type CaptionId } from "@/lib/story";
import { isCompact, useCompact, useStageScale } from "@/lib/stage";
import { SCREENS, loadScreen, saveScreen } from "@/lib/screens";
import { useSlideKeys } from "@/lib/keys";
import { useNarration } from "@/lib/llm";
import { FooterBar, Sidebar, Stage } from "@/components/slides/Shell";
import { StartScreen } from "@/components/slides/Start";
import { ScheduleScreen } from "@/components/slides/Schedule";
import { QuantumScreen } from "@/components/slides/Quantum";
import { CompareScreen } from "@/components/slides/Compare";
import { AskScreen } from "@/components/slides/Ask";
import { AboutScreen } from "@/components/slides/About";
import { MascotProvider } from "@/components/mascot/MascotProvider";
import { MoodGallery } from "@/components/mascot/MoodGallery";
import { TourLayer } from "@/components/mascot/Tour";
import { Reactions } from "@/components/mascot/Reactions";
import { TOUR, type TourState } from "@/lib/tour";
import type { FlexPreset, UiData } from "@/types";

const VIEWS = [StartScreen, ScheduleScreen, QuantumScreen, CompareScreen, AskScreen, AboutScreen];

export default function App() {
  useStageScale();
  const { data, error } = useUiData();
  if (window.location.hash === "#dewy-moods") return <MoodGallery />;

  if (error)
    return (
      <main className="grid h-dvh place-content-center gap-3 p-6 text-center">
        <h1 className="text-2xl font-semibold">GreenQ couldn&rsquo;t load its saved results</h1>
        <p className="text-muted-foreground">
          Start the server from the project folder with <code className="font-mono">python -m server</code>, then reload. ({error})
        </p>
      </main>
    );
  if (!data)
    return (
      <main className="grid h-dvh place-content-center text-muted-foreground" aria-busy="true">
        Loading…
      </main>
    );
  return <SlideApp data={data} />;
}

function SlideApp({ data }: { data: UiData }) {
  const [idx, setIdx] = useState(BALANCED);
  const [view, setView] = useState<View>("before");
  const [presetKey, setPreset] = useState<FlexPreset["key"]>("flexible");
  const [screen, setScreenRaw] = useState(loadScreen);
  const [dir, setDir] = useState(1);
  const [caption, setCaption] = useState<CaptionId | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [tour, setTour] = useState<TourState>(null);
  const [sideOpen, setSideOpen] = useState(() => !isCompact());
  const compact = useCompact();
  const narration = useNarration();
  const cur = useRef(screen);

  const setScreen = useCallback((i: number) => {
    const n = Math.max(0, Math.min(SCREENS.length - 1, i));
    setDir(n >= cur.current ? 1 : -1);
    cur.current = n;
    setScreenRaw(n);
    saveScreen(n);
  }, []);

  const { playing, togglePlay, stop: stopStory } = useStory({ setScreen, setIdx, setView, setCaption, setTour, balanced: BALANCED, last: data.sweep.length - 1 });
  const playingRef = useRef(playing);
  playingRef.current = playing;

  /** User navigation (not the story): pauses the story. */
  const go = useCallback((i: number) => { if (playingRef.current) stopStory(); setScreen(i); }, [stopStory, setScreen]);
  const setTourStep = useCallback((i: number) => {
    const n = Math.max(0, Math.min(TOUR.length - 1, i));
    go(TOUR[n].screen);
    setTour({ step: n, mode: "manual" });
  }, [go]);
  const startTour = useCallback(() => setTourStep(0), [setTourStep]);
  const endTour = useCallback(() => setTour(null), []);
  const show = useCallback((s: number, widget: string) => {
    go(s);
    setFlash(null);
    window.setTimeout(() => setFlash(widget), 50);
  }, [go]);
  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 2400);
    return () => window.clearTimeout(t);
  }, [flash]);

  useSlideKeys({
    count: SCREENS.length,
    go,
    step: (d) => go(cur.current + d),
    togglePlay,
    tour: () => startTour(),
  });

  const value: AppState = useMemo(() => {
    const preset = data.flex.presets.find((p) => p.key === presetKey) ?? data.flex.presets[0];
    const sweep = preset.sweep;
    const stop = sweep[idx];
    const hw = data.proof.find((p) => p.w === stop.w);
    return {
      data, idx, setIdx, view, setView, preset, setPreset, sweep, stop,
      proof: hw ?? data.proof.find((p) => p.w === 0.5)!,
      onHardware: stop.hardware, playing, togglePlay,
      screen, go, caption, flash, show, tour, startTour, setTourStep, endTour,
    };
  }, [data, idx, view, presetKey, playing, togglePlay, screen, go, caption, flash, show, tour, startTour, setTourStep, endTour]);

  const Current = VIEWS[screen];
  return (
    <AppContext.Provider value={value}>
      <MascotProvider>
      <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
        <Sidebar open={sideOpen} setOpen={setSideOpen} />
        <div className="relative flex min-w-0 flex-1 flex-col">
          <main className={`min-h-0 flex-1 overflow-hidden ${compact ? "px-4 pt-4 pb-4" : "pt-8 pr-[150px] pb-12 pl-10"}`} aria-label={SCREENS[screen].label}>
            <Stage screen={screen} dir={dir}>
              <Current />
            </Stage>
          </main>
          <FooterBar captionText={caption ? narration[caption] ?? null : null} />
        </div>
      </div>
      <TourLayer />
      <Reactions />
      </MascotProvider>
    </AppContext.Provider>
  );
}
