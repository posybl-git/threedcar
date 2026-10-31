'use client';

import { PerformanceMonitor } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { lazy, Suspense, useEffect, useState } from 'react';
import { brand, camera, quality, type QualityTier } from '@/config/car';
import { useExperience } from '@/store/experience';
import { CabinLights } from './CabinLights';
import { CameraRig } from './CameraRig';
import { Car } from './Car';
import { Effects } from './Effects';
import { Stage } from './Stage';

const Tuner = lazy(() => import('./Tuner'));

export default function Experience() {
  const tier = useExperience((s) => s.tier);
  const setTier = useExperience((s) => s.setTier);
  const [tune, setTune] = useState(false);

  useEffect(() => {
    // Phones/tablets start on medium; PerformanceMonitor adjusts from there.
    if (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768) setTier(1);
    setTune(new URLSearchParams(window.location.search).has('tune'));
  }, [setTier]);

  const step = (d: -1 | 1) => setTier(Math.max(0, Math.min(2, useExperience.getState().tier + d)) as QualityTier);

  return (
    <Canvas
      dpr={[1, quality.dpr[tier]]}
      gl={{ antialias: true, powerPreference: 'high-performance', stencil: false }}
      onCreated={(state) => {
        // Shader log checks force a synchronous GPU round-trip per program; keep them for development only.
        state.gl.debug.checkShaderErrors = process.env.NODE_ENV !== 'production';
        // Dev-only handle for automated visual checks.
        if (process.env.NODE_ENV !== 'production') Object.assign(window, { __r3f: state, __store: useExperience });
      }}
      camera={{ fov: camera.fov, near: 0.05, far: 60, position: [9, 1.2, 9] }}
      role="img"
      aria-label={`Interactive 3D view of the ${brand.model}. Drag to rotate; use the view buttons to jump to preset angles.`}
    >
      <PerformanceMonitor flipflops={3} onDecline={() => step(-1)} onIncline={() => step(1)} onFallback={() => setTier(0)} />
      <Suspense fallback={null}>
        <Stage />
        <CabinLights />
        <Car />
      </Suspense>
      <Effects />
      <CameraRig />
      {tune && (
        <Suspense fallback={null}>
          <Tuner />
        </Suspense>
      )}
    </Canvas>
  );
}
