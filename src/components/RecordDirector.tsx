'use client';

import dynamic from 'next/dynamic';
import { useEffect, useLayoutEffect } from 'react';
import { recording } from '@/config/car';
import { useExperience } from '@/store/experience';

// Only loaded for `?record&tune`: hides the dev tuning panel without touching the scene code.
const HideTuner = dynamic(() => import('leva').then((m) => ({ default: () => <m.Leva hidden /> })), { ssr: false });

/**
 * `?record` mode for screen captures:
 *  - locks the highest quality tier (PerformanceMonitor changes are ignored by the store),
 *  - tags <html class="recording"> so CSS hides the cursor and dev overlays,
 *  - once the intro sweep ends, walks the camera through `recording.path`, one shot every
 *    `recording.shotSeconds`, using the same preset requests as the view buttons. After the
 *    last shot the camera rig's own idle auto-rotate takes over.
 */
export function RecordDirector({ tune }: { tune: boolean }) {
  const introDone = useExperience((s) => s.introDone);

  // Layout effect: runs before the lazily loaded scene mounts, so its tier auto-detection is ignored.
  useLayoutEffect(() => {
    const s = useExperience.getState();
    s.lockTier(2);
    s.setRecording(true);
    document.documentElement.classList.add('recording');
    return () => document.documentElement.classList.remove('recording');
  }, []);

  useEffect(() => {
    if (!introDone) return;
    const { goTo } = useExperience.getState();
    const timers = recording.path.map((preset, i) =>
      window.setTimeout(() => goTo(preset), (i + 1) * recording.shotSeconds * 1000),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [introDone]);

  return tune ? <HideTuner /> : null;
}
