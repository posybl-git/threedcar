import type * as THREE from 'three';

type EnvMaterial = THREE.MeshStandardMaterial;

/**
 * three.js ignores `material.envMapIntensity` for materials that fall back to `scene.environment`;
 * the renderer substitutes `scene.environmentIntensity`. To give one material its own reflection
 * strength, bind the scene environment to it explicitly (and mirror the scene's env rotation).
 * Cheap enough to call every frame, so it also follows live tuning of the environment.
 */
export function bindEnvMap(material: EnvMaterial, scene: THREE.Scene, factor: number) {
  if (!scene.environment) return;
  if (material.envMap !== scene.environment) {
    material.envMap = scene.environment;
    material.needsUpdate = true;
  }
  material.envMapRotation.copy(scene.environmentRotation);
  material.envMapIntensity = scene.environmentIntensity * factor;
}
