import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { riseChild, staggerParent, viewportOnce } from '@/lib/motion';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Wrap children in a stagger parent so nested <RevealItem> fire in sequence. */
  stagger?: boolean;
  as?: 'div' | 'ul' | 'ol';
}

/**
 * Scroll reveal. Motivation: sequences content in reading order so a long page
 * lands one idea at a time instead of arriving as a wall.
 * Collapses to a plain static element under prefers-reduced-motion.
 */
export function Reveal({ children, className = '', stagger = false, as = 'div' }: RevealProps) {
  const reduce = useReducedMotion();
  const Element = motion[as];

  if (reduce) {
    const Static = as;
    return <Static className={className}>{children}</Static>;
  }

  return (
    <Element
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={stagger ? staggerParent : riseChild}
    >
      {children}
    </Element>
  );
}

interface RevealItemProps {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'li';
}

export function RevealItem({ children, className = '', as = 'div' }: RevealItemProps) {
  const reduce = useReducedMotion();
  const Element = motion[as];

  if (reduce) {
    const Static = as;
    return <Static className={className}>{children}</Static>;
  }

  return (
    <Element className={className} variants={riseChild}>
      {children}
    </Element>
  );
}
