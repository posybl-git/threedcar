'use client';

import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { interior } from '@/config/car';
import { cabinFactor } from './cabin';

RectAreaLightUniformsLib.init();

/**
 * Cabin lighting: a soft overhead area light and a weak windscreen fill. Both are always mounted (so
 * they never trigger a shader recompile mid-transition) but sit at intensity 0 until the camera enters
 * the cabin; they fade with the camera move via cabinFactor(). Positions are in the car's centred
 * space, like the camera presets.
 */
export function CabinLights() {
  const overhead = useRef<THREE.RectAreaLight>(null);
  const fill = useRef<THREE.SpotLight>(null);
  const fillTarget = useMemo(() => new THREE.Object3D(), []);
  const { overhead: o, windscreen: w } = interior;

  useLayoutEffect(() => {
    overhead.current?.lookAt(...o.lookAt);
  }, [o.lookAt]);

  useFrame(({ camera }) => {
    const k = cabinFactor(camera);
    if (overhead.current) overhead.current.intensity = o.intensity * k;
    if (fill.current) fill.current.intensity = w.intensity * k;
  });

  return (
    <>
      <rectAreaLight ref={overhead} position={o.position} width={o.width} height={o.height} color={o.color} intensity={0} />
      <spotLight
        ref={fill}
        target={fillTarget}
        position={w.position}
        color={w.color}
        intensity={0}
        distance={w.distance}
        angle={w.angle}
        penumbra={w.penumbra}
        decay={2}
      />
      <primitive object={fillTarget} position={w.target} />
    </>
  );
}
