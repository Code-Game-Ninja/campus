import type { ReactNode } from 'react';

interface SectionProps {
  id: string;
  children: ReactNode;
  /** Section background. Both values stay inside the locked light theme. */
  tone?: 'surface' | 'sunken';
  className?: string;
}

/** Page-width container + consistent vertical rhythm. VISUAL_DENSITY 3. */
export function Section({ id, children, tone = 'surface', className = '' }: SectionProps) {
  return (
    <section
      id={id}
      className={`${tone === 'sunken' ? 'bg-sunken' : 'bg-surface'} py-20 sm:py-28 lg:py-32 ${className}`}
    >
      <div className="mx-auto w-full max-w-[1180px] px-5 sm:px-8">{children}</div>
    </section>
  );
}

interface SectionHeadProps {
  /**
   * Small uppercase label above the headline. Rationed: at most one per three
   * sections across the whole page.
   */
  eyebrow?: string;
  title: ReactNode;
  body?: string;
  align?: 'start' | 'center';
}

/**
 * Headline and body stack vertically. No left-headline / right-floating-
 * paragraph split header anywhere on this page.
 */
export function SectionHead({ eyebrow, title, body, align = 'start' }: SectionHeadProps) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow ? (
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-deep">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-3xl font-bold leading-[1.12] sm:text-4xl lg:text-[2.75rem]">{title}</h2>
      {body ? (
        <p className={`mt-4 max-w-[62ch] text-base leading-relaxed text-muted ${align === 'center' ? 'mx-auto' : ''}`}>
          {body}
        </p>
      ) : null}
    </div>
  );
}
