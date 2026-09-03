import { Nav } from '@/components/Nav';
import { Hero } from '@/components/Hero';
import { ReleaseBand } from '@/components/ReleaseBand';
import { FeatureBento } from '@/components/FeatureBento';
import { FeatureTabs } from '@/components/FeatureTabs';
import { ScreenGallery } from '@/components/ScreenGallery';
import { InstallSteps } from '@/components/InstallSteps';
import { SafetyStatement } from '@/components/SafetyStatement';
import { ReportSection } from '@/components/ReportSection';
import { Faq } from '@/components/Faq';
import { Team } from '@/components/Team';
import { FinalCta } from '@/components/FinalCta';
import { Footer } from '@/components/Footer';
import { useLatestRelease } from '@/hooks/useLatestRelease';

/**
 * Section order is also the layout-family order: split hero, fact band, bento,
 * tabs, horizontal gallery, vertical rail, statement, split form, accordion,
 * asymmetric grid, accent panel. No family repeats.
 */
export default function App() {
  const state = useLatestRelease();
  const { downloadUrl, version } = state.release;

  return (
    <>
      <a
        href="#features"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-80 focus:rounded-field focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <Nav downloadUrl={downloadUrl} />

      <main>
        <Hero downloadUrl={downloadUrl} />
        <ReleaseBand state={state} />
        <FeatureBento />
        <FeatureTabs />
        <ScreenGallery />
        <InstallSteps downloadUrl={downloadUrl} />
        <SafetyStatement />
        <ReportSection version={version} />
        <Faq />
        <Team />
        <FinalCta downloadUrl={downloadUrl} version={version} />
      </main>

      <Footer />

      {/* Fixed, non-scrolling grain. Never repaints while the page scrolls. */}
      <div
        aria-hidden
        className="grain-overlay pointer-events-none fixed inset-0 z-60 opacity-[0.025]"
      />
    </>
  );
}
