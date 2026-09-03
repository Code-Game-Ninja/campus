import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CheckCircle } from '@phosphor-icons/react';
import { Section, SectionHead } from '@/components/ui/Section';
import { Reveal } from '@/components/ui/Reveal';
import { tabFeatures } from '@/data/features';
import { easeOutExpo } from '@/lib/motion';

/**
 * Tabs for the six secondary surfaces. Motivation for the motion: the panel
 * crossfade and the sliding indicator both communicate a state change, so the
 * user knows the content swapped rather than the page jumped.
 */
export function FeatureTabs() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const feature = tabFeatures[active]!;
  const Icon = feature.icon;

  const move = (delta: number) => {
    const next = (active + delta + tabFeatures.length) % tabFeatures.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <Section id="more" tone="sunken">
      <Reveal>
        <SectionHead
          title="And the parts you find in week two"
          body="Listings, clubs, verified opportunities, discovery, notification control and the safety tooling behind all of it."
        />
      </Reveal>

      <Reveal className="mt-12 grid gap-6 lg:grid-cols-12 lg:gap-10">
        <div
          role="tablist"
          aria-label="More CampusSphere features"
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
              event.preventDefault();
              move(1);
            }
            if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
              event.preventDefault();
              move(-1);
            }
          }}
          className="-mx-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 pb-2 lg:col-span-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
        >
          {tabFeatures.map((item, index) => {
            const selected = index === active;
            return (
              <button
                key={item.id}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={selected}
                aria-controls={`panel-${item.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(index)}
                className={`relative shrink-0 snap-start whitespace-nowrap rounded-field px-4 py-3 text-left text-sm font-semibold transition-colors duration-200 lg:w-full lg:whitespace-normal ${
                  selected ? 'text-brand-deep' : 'text-body hover:text-ink'
                }`}
              >
                {selected ? (
                  <motion.span
                    layoutId="tab-pill"
                    aria-hidden
                    className="absolute inset-0 rounded-field border border-brand/25 bg-surface"
                    transition={reduce ? { duration: 0 } : { duration: 0.32, ease: easeOutExpo }}
                  />
                ) : null}
                <span className="relative">{item.name}</span>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={feature.id}
              id={`panel-${feature.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${feature.id}`}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 1 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: easeOutExpo }}
              className="rounded-sheet border border-line bg-surface p-6 sm:p-8"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-field bg-brand-soft text-brand-deep">
                <Icon size={22} aria-hidden />
              </span>
              <h3 className="mt-5 text-2xl font-bold leading-snug">{feature.headline}</h3>
              <p className="mt-3 max-w-[58ch] text-[0.9375rem] leading-relaxed text-muted">
                {feature.body}
              </p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {feature.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5">
                    <CheckCircle size={18} className="mt-0.5 shrink-0 text-positive" aria-hidden />
                    <span className="text-sm leading-relaxed text-body">{point}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>
      </Reveal>
    </Section>
  );
}
