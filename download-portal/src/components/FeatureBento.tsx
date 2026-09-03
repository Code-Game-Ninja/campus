import { Section, SectionHead } from '@/components/ui/Section';
import { Reveal, RevealItem } from '@/components/ui/Reveal';
import { DeviceShot } from '@/components/ui/DeviceShot';
import { bentoFeatures, type BentoFeature } from '@/data/features';

/**
 * Bento grid. Five items, five cells, no empty tiles. Every cell carries a real
 * device capture, and the device bleeds past the bottom edge so the tiles read
 * as windows into the app rather than as cards with a picture pasted in.
 */
function BentoCell({ feature }: { feature: BentoFeature }) {
  const Icon = feature.icon;
  const side = feature.shotLayout === 'side';

  return (
    <RevealItem
      className={`${feature.span} relative flex flex-col overflow-hidden rounded-sheet border border-line bg-surface pt-6 transition-[border-color,box-shadow] duration-300 ease-[var(--ease-out-expo)] hover:border-line-strong hover:shadow-[0_24px_60px_-40px_rgba(16,24,40,0.35)] sm:pt-7 ${
        side ? 'lg:flex-row lg:items-start lg:gap-8' : ''
      }`}
    >
      <div className={`px-6 sm:px-7 ${side ? 'lg:flex-1 lg:pb-7' : ''}`}>
        <span className="flex h-11 w-11 items-center justify-center rounded-field bg-brand-soft text-brand-deep">
          <Icon size={22} aria-hidden />
        </span>
        <h3 className="mt-5 text-xl font-bold leading-snug sm:text-[1.375rem]">
          {feature.headline}
        </h3>
        <p className="mt-3 max-w-[48ch] text-[0.9375rem] leading-relaxed text-muted">
          {feature.body}
        </p>
      </div>

      <div
        className={
          side
            ? 'mt-7 flex justify-center px-6 sm:px-7 lg:mt-0 lg:w-[38%] lg:shrink-0 lg:justify-end lg:px-0 lg:pr-7'
            : 'mt-7 flex justify-center px-6 sm:px-7'
        }
      >
        <DeviceShot
          file={feature.shot}
          alt={feature.shotAlt}
          mode="peek"
          className={`-mb-14 h-56 w-[13.5rem] shrink-0 sm:h-64 sm:w-[15rem] ${
            side ? 'lg:h-72' : ''
          }`}
        />
      </div>
    </RevealItem>
  );
}

export function FeatureBento() {
  return (
    <Section id="features">
      <Reveal>
        <SectionHead
          eyebrow="What is inside"
          title="Everything a campus actually runs on"
          body="Five surfaces do most of the work. Each one exists because a WhatsApp group was doing it badly."
        />
      </Reveal>

      <Reveal stagger className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        {bentoFeatures.map((feature) => (
          <BentoCell key={feature.id} feature={feature} />
        ))}
      </Reveal>
    </Section>
  );
}
