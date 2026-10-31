import * as THREE from 'three';
import { interior } from '@/config/car';

const center = new THREE.Vector3(...interior.cabinCenter);

/**
 * 0 when the camera is outside the cabin, 1 when it is inside, smooth in between. Driven by camera
 * distance, so everything that uses it (cabin lights, glass, bloom) fades with the camera move itself.
 * Exterior presets sit ≥ 3.6 m away, far beyond `fadeFar`, so it is exactly 0 for the exterior.
 */
export function cabinFactor(camera: THREE.Camera) {
  const d = camera.position.distanceTo(center);
  const t = THREE.MathUtils.clamp((interior.fadeFar - d) / (interior.fadeFar - interior.fadeNear), 0, 1);
  return t * t * (3 - 2 * t);
}
