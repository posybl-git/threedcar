'use client';

import { useProgress } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import { brand } from '@/config/car';
import { useExperience } from '@/store/experience';

/** Full-screen loading veil with real asset progress; fades out once the car is on screen. */
export function Loader() {
  const { progress } = useProgress();
  const ready = useExperience((s) => s.ready);
  const recording = useExperience((s) => s.recording);
  const [gone, setGone] = useState(false);
  const done = ready && progress >= 100;
  // The loading manager's total grows as files are discovered (the HDRI can finish before the GLB
  // is registered), so raw progress can hit 100 and fall back. Show a monotonic value that holds
  // at 95% until shaders are compiled and the scene is actually ready.
  const shown = useRef(0);
  shown.current = done ? 100 : Math.max(shown.current, Math.min(95, progress * 0.95));

  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => setGone(true), 900);
    return () => window.clearTimeout(t);
  }, [done]);

  if (gone) return null;
  const pct = Math.round(shown.current);

  // Record mode: a plain black frame (no branding or bar) that cuts straight to the intro sweep.
  if (recording) {
    if (done) return null;
    return (
      <div
        className="absolute inset-0 z-50 bg-[var(--bg)]"
        role="progressbar"
        aria-label={`Loading ${brand.model}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      />
    );
  }

  return (
    <div
      className={`absolute inset-0 z-50 grid place-items-center bg-[var(--bg)] transition-opacity duration-700 ${done ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      role="progressbar"
      aria-label={`Loading ${brand.model}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div className="flex w-56 flex-col items-center gap-6">
        <span className="font-display text-sm tracking-[0.6em] text-[var(--fg)]">{brand.name}</span>
        <div className="h-px w-full overflow-hidden bg-white/10">
          <div className="h-full bg-[var(--accent)] transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] tabular-nums tracking-[0.2em] text-[var(--muted)]">{pct}%</span>
      </div>
    </div>
  );
}
