'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Counts from 0 to `value` once `start` is true (ease-out). Renders the final value until then,
 * so server HTML and no-JS readers get real numbers. Width is reserved to avoid layout shift.
 */
export function CountUp({ value, decimals = 0, start, durationMs }: { value: number; decimals?: number; start: boolean; durationMs: number }) {
  const reduced = useReducedMotion();
  const [current, setCurrent] = useState(value);
  const final = value.toFixed(decimals);

  useEffect(() => {
    if (!start || reduced) {
      setCurrent(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / durationMs);
      setCurrent(value * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    setCurrent(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, reduced, value, durationMs]);

  return (
    <>
      <span aria-hidden className="inline-block text-left tabular-nums" style={{ minWidth: `${final.length}ch` }}>
        {current.toFixed(decimals)}
      </span>
      <span className="sr-only">{final}</span>
    </>
  );
}
