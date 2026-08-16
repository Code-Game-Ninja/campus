import { useEffect, useRef, useState } from 'react';

export function AnimatedNumber({ value, display }: { value: number; display: string }) {
  const [shown, setShown] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / 620, 1);
      setShown(value * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value]);

  if (shown >= value * 0.995) return <>{display}</>;
  if (display.includes('K')) return <>{(shown / 1000).toFixed(1)}K</>;
  if (display.includes('%')) return <>{shown.toFixed(value % 1 ? 2 : 0)}%</>;
  return <>{Math.round(shown).toLocaleString()}</>;
}
