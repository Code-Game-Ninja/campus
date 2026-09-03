import type { Transition, Variants } from 'motion/react';

/**
 * MOTION_INTENSITY 6. Everything below is an entry, a reveal or a feedback
 * transition. No infinite loops, no scroll hijacking, no parallax.
 * Every consumer gates on useReducedMotion().
 */

export const easeOutExpo = [0.16, 1, 0.3, 1] as const;

export const softSpring: Transition = {
  type: 'spring',
  stiffness: 190,
  damping: 24,
  mass: 0.7,
};

export const revealTransition: Transition = {
  duration: 0.62,
  ease: easeOutExpo,
};

/** Parent that staggers its children as the section enters the viewport. */
export const staggerParent: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

export const riseChild: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: revealTransition },
};

export const fadeChild: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: revealTransition },
};

export const viewportOnce = { once: true, amount: 0.25 } as const;
