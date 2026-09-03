'use client';

/*
  Animated SVG path field, used as the hero backdrop.

  Adapted from the supplied component. The public API is unchanged
  (position, className, children); four things were fixed for this codebase:

  1. prefers-reduced-motion. The original loops 36 paths forever with no guard.
     Every animated component here gates on useReducedMotion(), so under reduce
     the paths render once, static, at their resting state.
  2. Colour. The original strokes text-slate-950 / dark:text-white. This page
     locks a single accent (#375DFB) and one light theme, so the stroke inherits
     the brand colour instead of introducing a second neutral family.
  3. Deterministic durations. The original called Math.random() during render,
     which produces a different value on every re-render and under StrictMode's
     double invoke. Duration is now derived from the path index.
  4. Removed the unused `color` field: stroke is driven by currentColor, so the
     computed rgba string was dead code.

  Cost note: 36 paths animating pathLength and pathOffset is stroke-dashoffset
  work, not transform or opacity, so it does paint on every frame. It is kept to
  one instance, behind the hero only, and never over scrolling content.
*/

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

interface FloatingPathsBackgroundProps {
  /** Horizontal skew of the path field. Negative leans left, positive right. */
  position: number;
  className?: string;
  children?: ReactNode;
}

export function FloatingPathsBackground({
  position,
  children,
  className,
}: FloatingPathsBackgroundProps) {
  const reduce = useReducedMotion();

  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
    // Spread 20s to 30s across the field instead of randomising per render.
    duration: 20 + (i % 11),
  }));

  return (
    <div className={cn('relative w-full', className)}>
      {/*
        opacity-55 keeps the field as texture rather than competition: the later
        paths compute a strokeOpacity above 1, which reads far too loud behind
        headline copy at full strength.
      */}
      <div aria-hidden className="pointer-events-none absolute inset-0 text-brand opacity-55">
        <svg
          className="h-full w-full"
          viewBox="0 0 696 316"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          {paths.map((path) => (
            <motion.path
              key={path.id}
              d={path.d}
              stroke="currentColor"
              strokeWidth={path.width}
              strokeOpacity={0.1 + path.id * 0.03}
              initial={reduce ? false : { pathLength: 0.3, opacity: 0.6 }}
              {...(reduce
                ? {}
                : {
                    animate: {
                      pathLength: [0.3, 1, 0.3],
                      opacity: [0.3, 0.6, 0.3],
                      pathOffset: [0, 1, 0],
                    },
                    transition: {
                      duration: path.duration,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: 'linear' as const,
                    },
                  })}
            />
          ))}
        </svg>
      </div>
      {children}
    </div>
  );
}
