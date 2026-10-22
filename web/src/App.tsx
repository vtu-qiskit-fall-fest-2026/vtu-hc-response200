import { useUiData } from "@/lib/data";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { DashboardBand, Faq, Footer, Hero, HowItWorks, Nav } from "@/components/site/Site";

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

  return (
    <>
      <Nav />
      <main>
        <Hero data={data} />
        <DashboardBand>
          <Dashboard data={data} />
        </DashboardBand>
        <HowItWorks data={data} />
        <Faq data={data} />
      </main>
      <Footer data={data} />
    </>
  );
}
