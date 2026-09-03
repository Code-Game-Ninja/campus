import { useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { softSpring } from '@/lib/motion';

interface MagneticProps {
  children: ReactNode;
  /** Maximum pull in pixels. Kept small so the control never dodges the cursor. */
  strength?: number;
  className?: string;
}

/**
 * Magnetic hover on the primary CTA. Motivation: feedback. The button leans
 * toward the pointer so the most important control on the page feels physical.
 *
 * Pointer position lives in motion values, never React state, so this never
 * re-renders the tree while the cursor moves.
 */
export function Magnetic({ children, strength = 7, className = '' }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const x = useSpring(pointerX, softSpring);
  const y = useSpring(pointerY, softSpring);
  const translateX = useTransform(x, (value) => value * strength);
  const translateY = useTransform(y, (value) => value * strength);

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: translateX, y: translateY }}
      onPointerMove={(event) => {
        if (event.pointerType !== 'mouse') return;
        const bounds = ref.current?.getBoundingClientRect();
        if (!bounds) return;
        pointerX.set((event.clientX - (bounds.left + bounds.width / 2)) / (bounds.width / 2));
        pointerY.set((event.clientY - (bounds.top + bounds.height / 2)) / (bounds.height / 2));
      }}
      onPointerLeave={() => {
        pointerX.set(0);
        pointerY.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}
