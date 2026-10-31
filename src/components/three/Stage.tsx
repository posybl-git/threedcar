'use client';

import { ContactShadows, Environment, Lightformer, MeshReflectorMaterial } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { DoubleSide, type MeshStandardMaterial } from 'three';
import { quality, render } from '@/config/car';
import { useExperience } from '@/store/experience';
import { bindEnvMap } from './envMap';

/** Studio: HDRI lighting/reflections, reflective floor, soft contact shadow, horizon fog. */
export function Stage() {
  const tier = useExperience((s) => s.tier);
  const { environment: env, floor, contactShadow: cs } = render;
  const floorMat = useRef<MeshStandardMaterial>(null);

  // Keep the floor's own (low) reflection strength; see bindEnvMap.
  useFrame(({ scene }) => floorMat.current && bindEnvMap(floorMat.current, scene, floor.envMapIntensity));

  return (
    <>
      <color attach="background" args={[render.background]} />
      <fog attach="fog" args={[render.background, render.fog.near, render.fog.far]} />

      {/* The HDRI is rendered into a cube map together with a few studio "flags" (drei portal mode):
          - its white cyc floor is masked with a dark disc so the car's lower panels reflect a floor
            that matches ours;
          - its patterned acoustic ceiling (which aliases into moiré on glossy panels) is masked
            above ~38° elevation and replaced by one clean overhead softbox strip.
          The octaboxes and white walls near the horizon still light and reflect as captured. */}
      <Environment
        files={env.files}
        resolution={512}
        frames={1}
        environmentIntensity={env.intensity}
        environmentRotation={env.rotation}
      >
        <mesh position-y={-0.6} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[120, 64]} />
          <meshBasicMaterial color={env.groundColor} side={DoubleSide} />
        </mesh>
        <mesh position-y={env.ceiling.height} rotation-x={Math.PI / 2}>
          <circleGeometry args={[env.ceiling.radius, 64]} />
          <meshBasicMaterial color={env.ceiling.color} side={DoubleSide} />
        </mesh>
        <Lightformer
          form="rect"
          intensity={env.softbox.intensity}
          position={[0, env.ceiling.height - 0.05, 0]}
          rotation-x={Math.PI / 2}
          scale={env.softbox.scale}
        />
      </Environment>

      <mesh rotation-x={-Math.PI / 2} position-y={-0.001}>
        <planeGeometry args={[80, 80]} />
        <MeshReflectorMaterial
          ref={floorMat as never}
          key={tier /* resolution is fixed at creation */}
          resolution={quality.reflectorResolution[tier]}
          blur={floor.blur}
          mixBlur={floor.mixBlur}
          mixStrength={floor.mixStrength}
          mixContrast={1}
          mirror={floor.mirror}
          depthScale={0.8}
          minDepthThreshold={0.35}
          maxDepthThreshold={1.3}
          color={floor.color}
          roughness={floor.roughness}
          metalness={floor.metalness}
        />
      </mesh>

      {/* The car is static, so the shadow is rendered once (frames=1) and re-rendered only on tier change. */}
      <ContactShadows
        key={`cs-${tier}`}
        frames={1}
        position-y={0.002}
        scale={cs.scale}
        resolution={quality.shadowResolution[tier]}
        opacity={cs.opacity}
        blur={cs.blur}
        far={cs.far}
        color="#000000"
      />
    </>
  );
}
