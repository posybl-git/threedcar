'use client';

import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { camera as cameraCfg, interior, model } from '@/config/car';
import { bindEnvMap } from './envMap';

/**
 * Ray casts run while rendering, before R3F has applied the model's offset on commit; place the
 * model explicitly first so world coordinates match the centred car space.
 */
function placeCar(car: THREE.Object3D) {
  car.position.set(...model.offset);
  car.updateMatrixWorld(true);
}

const findMesh = (root: THREE.Object3D, name: string) => {
  let found: THREE.Mesh | null = null;
  root.traverse((o) => {
    if (!found && (o as THREE.Mesh).isMesh && (o.name === name || o.parent?.name === name)) found = o as THREE.Mesh;
  });
  return found as THREE.Mesh | null;
};

/** The cabin's soft-touch material, without UV-dependent maps (our geometry has its own UVs). */
function cabinPlastic(car: THREE.Object3D) {
  const src = findMesh(car, 'InteriorDashMid')?.material as THREE.MeshStandardMaterial | undefined;
  const m = (src ?? new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.82 })).clone();
  m.aoMap = null;
  m.normalMap = null;
  m.name = 'Mirror housing';
  return m;
}

// ---------------------------------------------------------------------------
// Rear-view mirror

export function InteriorMirror({ car }: { car: THREE.Object3D }) {
  const cfg = interior.mirror;
  const built = useMemo(() => {
    placeCar(car);
    const center = new THREE.Vector3(...cfg.center);
    const eye = new THREE.Vector3(...cameraCfg.presets.interior.position);
    // Orientation: housing faces the driver's eye.
    const look = new THREE.Object3D();
    look.position.copy(center);
    look.lookAt(eye);
    // Mount point: straight up from the housing to the windscreen.
    const glass = findMesh(car, 'BodyWindshield');
    const ray = new THREE.Raycaster(center, new THREE.Vector3(0, 1, 0), 0, 0.3);
    const hit = glass ? ray.intersectObject(glass, false)[0] : undefined;
    const mount = hit?.point ?? center.clone().add(new THREE.Vector3(0, 0.05, 0));
    const normal = hit?.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, -1, 0);
    if (normal.y > 0) normal.negate(); // pad sits on the cabin side
    const stemTop = mount.clone().addScaledVector(normal, 0.006);
    const stemBottom = center.clone().add(new THREE.Vector3(0, cfg.size[1] * 0.3, 0));
    const stemLen = stemTop.distanceTo(stemBottom);
    const stemMid = stemTop.clone().add(stemBottom).multiplyScalar(0.5);
    const stemQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), stemTop.clone().sub(stemBottom).normalize());
    const padQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().negate());
    return { center, quat: look.quaternion.clone(), stemMid, stemLen, stemQuat, padPos: mount.clone().addScaledVector(normal, 0.004), padQuat };
  }, [car, cfg.center, cfg.size]);

  const housing = useMemo(() => cabinPlastic(car), [car]);
  const glassMat = useMemo(
    () => new THREE.MeshPhysicalMaterial({ name: 'Mirror glass', color: cfg.glassTint, metalness: 1, roughness: 0.03 }),
    [cfg.glassTint],
  );
  useFrame(({ scene }) => bindEnvMap(glassMat, scene, cfg.glassReflection));

  const [w, h, d] = cfg.size;
  return (
    <group name="InteriorMirror">
      <group position={built.center} quaternion={built.quat}>
        <RoundedBox args={[w, h, d]} radius={cfg.cornerRadius} smoothness={4} material={housing} />
        {/* glass: inset into the face that looks at the driver (+z after lookAt) */}
        <RoundedBox args={[w - 0.01, h - 0.01, 0.003]} radius={cfg.cornerRadius * 0.7} smoothness={4} position-z={d / 2 - 0.0005} material={glassMat} />
      </group>
      <mesh position={built.stemMid} quaternion={built.stemQuat} material={housing}>
        <cylinderGeometry args={[0.0055, 0.007, built.stemLen, 16]} />
      </mesh>
      <RoundedBox args={[0.045, 0.032, 0.008]} radius={0.003} smoothness={3} position={built.padPos} quaternion={built.padQuat} material={housing} />
    </group>
  );
}
