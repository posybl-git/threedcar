'use client';

/**
 * Dev-only live tuning panel, enabled with `?tune` in the URL.
 * Mutates the config objects in place so the running scene picks the values up;
 * copy the final numbers into src/config/car.ts.
 */
import { useThree } from '@react-three/fiber';
import { useControls } from 'leva';
import { useEffect } from 'react';
import * as THREE from 'three';
import { accentPaint, materials, paints, render } from '@/config/car';
import { useExperience } from '@/store/experience';

export default function Tuner() {
  const scene = useThree((s) => s.scene);
  const paintId = useExperience((s) => s.paint);
  const setPaint = useExperience((s) => s.setPaint);
  const paint = paints.find((p) => p.id === paintId) ?? paints[0];

  useControls('Swatch', {
    swatch: { value: paintId, options: Object.fromEntries(paints.map((p) => [p.name, p.id])), onChange: setPaint },
  });

  useControls(
    `Paint: ${paint.name}`,
    {
      color: { value: paint.color, onChange: (v: string) => (paint.color = v) },
      metalness: { value: paint.metalness, min: 0, max: 1, step: 0.01, onChange: (v: number) => (paint.metalness = v) },
      roughness: { value: paint.roughness, min: 0, max: 1, step: 0.01, onChange: (v: number) => (paint.roughness = v) },
      clearcoatRoughness: { value: paint.clearcoatRoughness, min: 0, max: 0.3, step: 0.005, onChange: (v: number) => (paint.clearcoatRoughness = v) },
    },
    [paint.id],
  );

  useControls('Flakes', {
    near: { value: materials.paint.flakeNormalScale, min: 0, max: 1, step: 0.01, onChange: (v: number) => (materials.paint.flakeNormalScale = v) },
    far: { value: materials.paint.flakeNormalScaleFar, min: 0, max: 1, step: 0.01, onChange: (v: number) => (materials.paint.flakeNormalScaleFar = v) },
    fadeNear: { value: materials.paint.flakeFadeNear, min: 1, max: 15, step: 0.1, onChange: (v: number) => (materials.paint.flakeFadeNear = v) },
    fadeFar: { value: materials.paint.flakeFadeFar, min: 1, max: 20, step: 0.1, onChange: (v: number) => (materials.paint.flakeFadeFar = v) },
  });

  const accent = useControls('Accent paint', {
    color: accentPaint.color,
    metalness: { value: accentPaint.metalness, min: 0, max: 1, step: 0.01 },
    roughness: { value: accentPaint.roughness, min: 0, max: 1, step: 0.01 },
  });

  const env = useControls('Environment', {
    intensity: { value: render.environment.intensity, min: 0, max: 3, step: 0.01 },
    rotationY: { value: render.environment.rotation[1], min: -Math.PI, max: Math.PI, step: 0.01 },
  });

  useEffect(() => {
    scene.environmentIntensity = env.intensity;
    scene.environmentRotation.set(0, env.rotationY, 0);
  }, [scene, env]);

  useEffect(() => {
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshPhysicalMaterial | undefined;
      if (m?.name !== 'Paint 2 Carmine') return;
      m.color.set(accent.color);
      m.metalness = accent.metalness;
      m.roughness = accent.roughness;
    });
  }, [scene, accent]);

  return null;
}
