import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Minus, Plus } from '@phosphor-icons/react';
import { Section, SectionHead } from '@/components/ui/Section';
import { Reveal } from '@/components/ui/Reveal';
import { faqs } from '@/data/faqs';
import { easeOutExpo } from '@/lib/motion';

/**
 * Accordion. Motion is a real height transition so the answer reads as
 * expanding in place rather than the page jumping under the cursor.
 */
export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();

  return (
    <Section id="faq">
      <Reveal>
        <SectionHead
          title="Questions people actually ask"
          body="Mostly about sideloading, updates and what happens to your data."
        />
      </Reveal>

      <Reveal className="mt-10 max-w-3xl">
        <div className="divide-y divide-line border-t border-line">
          {faqs.map((faq, index) => {
            const expanded = open === index;
            return (
              <div key={faq.question}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`faq-panel-${index}`}
                    onClick={() => setOpen(expanded ? null : index)}
                    className="flex w-full items-start justify-between gap-6 py-5 text-left transition-colors hover:text-brand-deep"
                  >
                    <span className="font-display text-[1.0625rem] font-bold leading-snug text-ink">
                      {faq.question}
                    </span>
                    <span
                      aria-hidden
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
                        expanded
                          ? 'border-brand bg-brand text-white'
                          : 'border-line-strong text-body'
                      }`}
                    >
                      {expanded ? <Minus size={14} /> : <Plus size={14} />}
                    </span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {expanded ? (
                    <motion.div
                      id={`faq-panel-${index}`}
                      initial={reduce ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.32, ease: easeOutExpo }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-[68ch] pb-6 pr-10 text-[0.9375rem] leading-relaxed text-muted">
                        {faq.answer}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </Reveal>
    </Section>
  );
}
