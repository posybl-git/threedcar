'use client';

import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { useFrame } from '@react-three/fiber';
import { type BloomEffect, ToneMappingMode } from 'postprocessing';
import { useRef } from 'react';
import { HalfFloatType, MathUtils } from 'three';
import { interior, quality, render } from '@/config/car';
import { useExperience } from '@/store/experience';
import { cabinFactor } from './cabin';

/**
 * HDR pipeline: scene -> (bloom on >1.0 luminance only) -> tone mapping -> vignette -> SMAA.
 * EffectComposer sets the renderer to NoToneMapping, so ToneMapping here is the only tone map.
 */
export function Effects() {
  const tier = useExperience((s) => s.tier);
  const { bloom, vignette } = render;
  const mode = render.toneMapping === 'agx' ? ToneMappingMode.AGX : ToneMappingMode.ACES_FILMIC;
  const bloomRef = useRef<BloomEffect>(null);

  // Inside the cabin the threshold drops so the gauges get a gentle glow (their HDR luminance is ~1.2,
  // below the exterior threshold). Outside, cabinFactor is 0 and the exterior values apply unchanged.
  useFrame(({ camera }) => {
    const b = bloomRef.current;
    if (!b) return;
    const k = cabinFactor(camera);
    b.luminanceMaterial.threshold = MathUtils.lerp(bloom.threshold, interior.bloom.threshold, k);
    b.intensity = MathUtils.lerp(bloom.intensity, interior.bloom.intensity, k);
  });

  return (
    <EffectComposer key={tier} multisampling={quality.msaa[tier]} frameBufferType={HalfFloatType} enableNormalPass={false}>
      <>{quality.bloom[tier] && <Bloom ref={bloomRef} mipmapBlur intensity={bloom.intensity} luminanceThreshold={bloom.threshold} luminanceSmoothing={bloom.smoothing} radius={bloom.radius} />}</>
      <ToneMapping mode={mode} />
      <Vignette offset={vignette.offset} darkness={vignette.darkness} />
      <SMAA />
    </EffectComposer>
  );
}
