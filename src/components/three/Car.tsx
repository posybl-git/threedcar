'use client';

import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { accentPaint, interior, materialBlend, materials as tuning, model, paints, rims } from '@/config/car';
import { useExperience } from '@/store/experience';
import { cabinFactor } from './cabin';
import { bindEnvMap } from './envMap';
import { InteriorMirror } from './InteriorExtras';

let ktx2Loader: KTX2Loader | null = null;
function getKTX2Loader(gl: THREE.WebGLRenderer) {
  ktx2Loader ??= new KTX2Loader().setTranscoderPath('/basis/').detectSupport(gl);
  return ktx2Loader;
}

type CarMaterials = {
  body: THREE.MeshPhysicalMaterial;
  accent: THREE.MeshPhysicalMaterial;
  glass: THREE.MeshPhysicalMaterial;
  rimFace: THREE.MeshStandardMaterial;
  flake: THREE.Texture | null;
};

/** Upgrade the GLB's materials in place. Idempotent (safe under StrictMode / HMR). */
function setupMaterials(scene: THREE.Object3D, gl: THREE.WebGLRenderer): CarMaterials {
  const byName = new Map<string, THREE.MeshStandardMaterial>();
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const m of [mesh.material].flat() as THREE.MeshStandardMaterial[]) byName.set(m.name, m);
  });

  const get = (name: string) => {
    const m = byName.get(name);
    if (!m) throw new Error(`Material "${name}" not found in ${model.url}`);
    return m;
  };
  // Clearcoat / transmission in the GLB make GLTFLoader create these as MeshPhysicalMaterial.
  const physical = (name: string) => {
    const m = get(name) as THREE.MeshPhysicalMaterial;
    if (!m.isMeshPhysicalMaterial) throw new Error(`Material "${name}" must be physical (clearcoat/transmission)`);
    return m;
  };

  const names = model.materials;
  const body = physical(names.bodyPaint);
  const accent = physical(names.accentPaint);
  const glass = physical(names.glass);
  const rimFace = get(names.rimFace);
  const chrome = get(names.rimChrome);

  // Car paint: metallic base + flake normal + clearcoat. Colour / metal / rough come from the swatch.
  for (const p of [body, accent]) {
    p.clearcoat = tuning.paint.clearcoat;
    p.clearcoatNormalMap = null; // clearcoat stays mirror-smooth above the flakes
  }
  const flake = body.normalMap;
  if (flake) {
    // The GLB samples flakes with nearest magnification; that produces moiré bands on grazing panels
    // when a flake texel lands near one pixel. Linear mag + trilinear/anisotropic min + finer tiling
    // keeps them stable during auto-rotate; the distance fade below removes sub-pixel sparkle.
    flake.magFilter = THREE.LinearFilter;
    flake.minFilter = THREE.LinearMipmapLinearFilter;
    flake.repeat.setScalar(tuning.paint.flakeRepeat);
    flake.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    flake.needsUpdate = true;
    accent.normalMap = flake;
  }
  accent.color.set(accentPaint.color);
  accent.metalness = accentPaint.metalness;
  accent.roughness = accentPaint.roughness;
  accent.clearcoat = accentPaint.clearcoat;
  accent.clearcoatRoughness = accentPaint.clearcoatRoughness;

  glass.color.set(tuning.glass.tint);
  glass.ior = tuning.glass.ior;
  glass.thickness = tuning.glass.thickness;
  glass.roughness = tuning.glass.roughness;
  glass.metalness = 0;
  glass.specularIntensity = 1;

  chrome.metalness = tuning.chrome.metalness;
  chrome.roughness = tuning.chrome.roughness;
  chrome.color.set('#ffffff');

  for (const name of [names.tyreSide, names.tyreTread]) {
    const t = byName.get(name);
    if (t) t.roughness = tuning.tyre.roughness;
  }
  const mirror = byName.get(names.mirror);
  if (mirror) {
    mirror.metalness = 1;
    mirror.roughness = 0;
  }

  scene.traverse((o) => {
    o.castShadow = false;
    o.receiveShadow = false;
  });

  setupInterior(scene, gl);

  return { body, accent, glass, rimFace, flake };
}

/** A standard material upgraded to physical (for sheen / anisotropy), keeping its maps and factors. */
function toPhysical(m: THREE.MeshStandardMaterial): THREE.MeshPhysicalMaterial {
  if ((m as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial) return m as THREE.MeshPhysicalMaterial;
  const p = new THREE.MeshPhysicalMaterial();
  THREE.MeshStandardMaterial.prototype.copy.call(p, m); // standard copy resets defines...
  p.defines = { STANDARD: '', PHYSICAL: '' }; // ...so restore the physical ones
  return p;
}

const isInteriorMesh = (o: THREE.Object3D) => {
  for (let n: THREE.Object3D | null = o; n; n = n.parent) if (n.name.startsWith('Interior')) return true;
  return false;
};

/**
 * Cabin materials. Only meshes under an Interior* node change; materials the exterior also uses (Trim)
 * are cloned for the cabin rather than edited. Existing textures and base colours are kept.
 * Idempotent: a second run finds the already-upgraded materials by name.
 */
function setupInterior(scene: THREE.Object3D, gl: THREE.WebGLRenderer) {
  const m = interior.materials;
  const aniso = gl.capabilities.getMaxAnisotropy();
  // One upgraded material per (source material, variant): 'inplace' replaces the source for all its
  // cabin users; any other key is a separate copy (e.g. Trim for the cabin, Interior 1 for the wheel rim).
  const variants = new Map<string, THREE.MeshPhysicalMaterial>();
  const variant = (src: THREE.MeshStandardMaterial, key: string, finish: (p: THREE.MeshPhysicalMaterial) => void) => {
    const id = `${src.uuid}:${key}`;
    let p = variants.get(id);
    if (!p) {
      p = toPhysical(src);
      if (key !== 'inplace') {
        if (p === src) p = p.clone();
        p.name = `${src.name} (${key})`;
      }
      finish(p);
      variants.set(id, p);
    }
    return p;
  };

  const leather = (p: THREE.MeshPhysicalMaterial) => {
    p.roughness = m.leather.roughness;
    p.metalness = 0;
    p.sheen = m.leather.sheen;
    p.sheenRoughness = m.leather.sheenRoughness;
    p.sheenColor.set('#ffffff'); // sheen strength only; the base colour is the model's own
  };
  const softTouch = (p: THREE.MeshPhysicalMaterial) => { p.roughness = m.softTouch.roughness; p.metalness = 0; };
  const satin = (p: THREE.MeshPhysicalMaterial) => { p.roughness = m.satin.roughness; p.metalness = 0; };
  const rubber = (p: THREE.MeshPhysicalMaterial) => { p.roughness = m.rubber.roughness; p.metalness = 0; };
  const aluminium = (p: THREE.MeshPhysicalMaterial) => {
    p.metalness = m.aluminium.metalness;
    p.roughness = m.aluminium.roughness;
    p.anisotropy = m.aluminium.anisotropy; // brushed look
  };
  const gauges = (p: THREE.MeshPhysicalMaterial) => { p.emissiveIntensity = m.gaugeEmissiveIntensity; p.roughness = m.gaugeRoughness; };

  // material name -> finish; '(rim)' marks steering-wheel parts that share Interior 1 with the dash.
  const finishFor = (name: string, mesh: THREE.Object3D): [string, (p: THREE.MeshPhysicalMaterial) => void] | null => {
    if (name === 'Interior 3 Carmine' || name === 'Interior 2') return ['inplace', leather];
    if (name === 'Interior 1') return /SteeringWheel/.test(mesh.name) ? ['leather', leather] : ['inplace', softTouch];
    if (name === 'Panel Sides') return ['inplace', softTouch];
    if (name === 'Floormat') return ['inplace', rubber];
    if (name === 'Hardware') return ['inplace', aluminium];
    if (name === 'Dashboard') return ['inplace', gauges];
    if (name === 'Trim') return ['interior', satin]; // shared with exterior gaskets/wipers: clone
    return null;
  };

  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !isInteriorMesh(mesh)) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (/((leather|interior))$/.test(mat.name)) return; // already upgraded (second run)
    const finish = finishFor(mat.name, mesh);
    if (!finish) return;
    const next = variant(mat, finish[0], finish[1]);
    mesh.material = next;
    // Sharp angled surfaces (dash top, floor, door cards): full anisotropic filtering on cabin textures.
    for (const t of [next.normalMap, next.emissiveMap, next.map]) {
      if (t && t.anisotropy !== aniso) {
        t.anisotropy = aniso;
        t.needsUpdate = true;
      }
    }
  });
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export function Car() {
  const gl = useThree((s) => s.gl);
  // three's KTX2Loader (matches the self-hosted transcoder in /public/basis); drei types the slot
  // against three-stdlib's equivalent class, hence the cast.
  const { scene } = useGLTF(model.url, false, true, (loader) => loader.setKTX2Loader(getKTX2Loader(gl) as never));
  const mats = useMemo(() => setupMaterials(scene, gl), [scene, gl]);
  const tier = useExperience((s) => s.tier);
  const transmission = tier > 0;

  // Glass: real refraction on medium/high tiers, cheap transparency on low.
  useLayoutEffect(() => {
    const g = mats.glass;
    g.transmission = transmission ? tuning.glass.transmission : 0;
    g.transparent = !transmission;
    g.opacity = transmission ? 1 : tuning.glass.opacityFallback;
    g.depthWrite = transmission;
    g.needsUpdate = true;
  }, [mats, transmission]);

  // Start on the selected swatch without blending in from the GLB's original red.
  useLayoutEffect(() => {
    const { paint, rim } = useExperience.getState();
    applyFinish(mats.body, paints.find((p) => p.id === paint) ?? paints[0], 1);
    applyFinish(mats.rimFace, rims.find((r) => r.id === rim) ?? rims[0], 1);
  }, [mats]);

  // Compile every shader in the scene (in parallel where KHR_parallel_shader_compile exists) before
  // revealing it, so the loader covers compilation instead of the first frames stuttering.
  const { scene: root, camera } = useThree();
  useEffect(() => {
    let cancelled = false;
    gl.compileAsync(root, camera)
      .catch(() => {}) // compile errors surface on render anyway; never block the reveal
      .then(() => !cancelled && useExperience.getState().setReady());
    return () => {
      cancelled = true;
    };
  }, [gl, root, camera]);

  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    const { paint, rim } = useExperience.getState();
    // Exponential approach: ~98% of the way after `materialBlend` seconds.
    const k = 1 - Math.exp((-4 * Math.min(dt, 0.1)) / materialBlend);
    applyFinish(mats.body, paints.find((p) => p.id === paint) ?? paints[0], k);
    applyFinish(mats.rimFace, rims.find((r) => r.id === rim) ?? rims[0], k);

    // Fade flake strength with distance to avoid sub-pixel sparkle aliasing.
    const { flakeNormalScale: near, flakeNormalScaleFar: far, flakeFadeNear, flakeFadeFar } = tuning.paint;
    const d = state.camera.position.distanceTo(tmp.set(0, 0.5, 0));
    const s = THREE.MathUtils.lerp(near, far, smoothstep(flakeFadeNear, flakeFadeFar, d));
    mats.body.normalScale.setScalar(s);
    mats.accent.normalScale.setScalar(s);

    // Glass reflects the studio less strongly than paint (reads as tinted glass, not a mirror); from
    // inside the cabin it reflects even less so the view out stays clear rather than milky.
    const inCabin = cabinFactor(state.camera);
    bindEnvMap(mats.glass, state.scene, THREE.MathUtils.lerp(tuning.glass.envMapIntensity, interior.glassEnvMapIntensity, inCabin));
  });

  return (
    <>
      <primitive object={scene} position={model.offset} />
      {/* Code-built cabin part, placed in world (= centred car) coordinates after the model is positioned. */}
      <InteriorMirror car={scene} />
    </>
  );
}

const target = new THREE.Color();
function applyFinish(
  m: THREE.MeshStandardMaterial & { clearcoatRoughness?: number },
  f: { color: string; metalness: number; roughness: number; clearcoatRoughness?: number },
  k: number,
) {
  m.color.lerp(target.set(f.color), k);
  m.metalness += (f.metalness - m.metalness) * k;
  m.roughness += (f.roughness - m.roughness) * k;
  if (f.clearcoatRoughness !== undefined && m.clearcoatRoughness !== undefined) m.clearcoatRoughness += (f.clearcoatRoughness - m.clearcoatRoughness) * k;
}
