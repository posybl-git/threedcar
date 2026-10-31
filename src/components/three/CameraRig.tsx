'use client';

import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { type ComponentRef, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { camera as cfg, interior, type CameraPreset, type InteriorPreset, type PresetId } from '@/config/car';
import { prefersReducedMotion } from '@/hooks/useReducedMotion';
import { useExperience } from '@/store/experience';
import { cabinFactor } from './cabin';

type OrbitControlsImpl = ComponentRef<typeof OrbitControls>;

const DEG = Math.PI / 180;
const pivot = new THREE.Vector3(...cfg.orbitTarget);

/** Portrait / narrow screens: wider FOV and more distance so the whole car fits. */
function viewFor(aspect: number) {
  const fov = aspect < 1 ? 40 : cfg.fov;
  // Distance grows with narrowness so the car's full length (side view) stays in frame on phones.
  const fit = aspect >= 1.5 ? 1 : Math.pow(1.5 / aspect, aspect < 1 ? 1 : 0.85);
  return { fov, distanceScale: fit * (Math.tan((cfg.fov * DEG) / 2) / Math.tan((fov * DEG) / 2)) };
}

type Pose = { position: THREE.Vector3; target: THREE.Vector3; fov: number; interior?: boolean };
type View = ReturnType<typeof viewFor>;

const DRIVER_ORBIT_RADIUS = 0.2;

function poseFor(preset: CameraPreset, view: View): Pose {
  if (preset.kind === 'interior') {
    const position = new THREE.Vector3(...preset.position);
    // Orbit a point just ahead of the eye: dragging then "looks around" from the seat.
    const radius = preset.orbitRadius ?? DRIVER_ORBIT_RADIUS;
    const target = new THREE.Vector3(...preset.lookAt).sub(position).setLength(radius).add(position);
    return { position, target, fov: preset.fov, interior: true };
  }
  const target = new THREE.Vector3(...preset.target);
  const offset = new THREE.Vector3().setFromSphericalCoords(preset.distance * view.distanceScale, preset.polar * DEG, preset.azimuth * DEG);
  return { position: target.clone().add(offset), target, fov: view.fov };
}

type Tween = { from: Pose; to: Pose; via?: Pose; t: number; duration: number; ease: (t: number) => number; onDone?: () => void };

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

const sA = new THREE.Spherical();
const sB = new THREE.Spherical();
const v = new THREE.Vector3();

/**
 * Exterior moves arc on a sphere around the car so they don't cut through it. Moves between two cabin
 * views go in a straight line: the cabin presets are placed so that line stays clear of the seats,
 * wheel and doors, whereas an arc around the car's centre would swing through them.
 */
function lerpPose(a: Pose, b: Pose, t: number, out: Pose) {
  if (a.interior && b.interior) {
    out.position.lerpVectors(a.position, b.position, t);
    out.target.lerpVectors(a.target, b.target, t);
    out.fov = THREE.MathUtils.lerp(a.fov, b.fov, t);
    return;
  }
  sA.setFromVector3(v.copy(a.position).sub(pivot));
  sB.setFromVector3(v.copy(b.position).sub(pivot));
  let dTheta = sB.theta - sA.theta;
  if (dTheta > Math.PI) dTheta -= 2 * Math.PI;
  if (dTheta < -Math.PI) dTheta += 2 * Math.PI;
  sA.set(
    THREE.MathUtils.lerp(sA.radius, sB.radius, t),
    THREE.MathUtils.lerp(sA.phi, sB.phi, t),
    sA.theta + dTheta * t,
  );
  out.position.setFromSpherical(sA).add(pivot);
  out.target.lerpVectors(a.target, b.target, t);
  out.fov = THREE.MathUtils.lerp(a.fov, b.fov, t);
}

export function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, gl, size } = useThree();
  const tween = useRef<Tween | null>(null);
  const idleTimer = useRef<number>(undefined);
  const mode = useRef<'exterior' | 'interior'>('exterior');
  const cabinPreset = useRef<InteriorPreset>(cfg.presets.interior);
  const pose = useRef<Pose>({ position: new THREE.Vector3(), target: new THREE.Vector3(), fov: cfg.fov });
  const ready = useExperience((s) => s.ready);
  const view = viewFor(size.width / size.height);

  const pc = camera as THREE.PerspectiveCamera;
  useEffect(() => {
    if (tween.current) return;
    pc.fov = mode.current === 'interior' ? cabinPreset.current.fov : view.fov;
    pc.updateProjectionMatrix();
  }, [pc, view.fov]);

  /** Orbit limits for the exterior, or for one cabin view (passed in). */
  const applyLimits = (cabin: InteriorPreset | null) => {
    const c = controls.current;
    if (!c) return;
    mode.current = cabin ? 'interior' : 'exterior';
    if (cabin) cabinPreset.current = cabin;
    c.enableZoom = !cabin;
    c.minAzimuthAngle = -Infinity;
    c.maxAzimuthAngle = Infinity;
    if (!cabin) {
      c.minDistance = cfg.minDistance * view.distanceScale;
      c.maxDistance = cfg.maxDistance * view.distanceScale;
      c.minPolarAngle = cfg.minPolar * DEG;
      c.maxPolarAngle = cfg.maxPolar * DEG;
      return;
    }
    const radius = cabin.orbitRadius ?? DRIVER_ORBIT_RADIUS;
    c.minDistance = c.maxDistance = radius;
    if (cabin.lookRange === undefined) {
      // Driver-style limits. The camera orbits a point ahead of the eye, so looking UP means the
      // camera sits below that point: polar angle above 90°. Looking down is allowed to 35°.
      c.minPolarAngle = 55 * DEG;
      c.maxPolarAngle = (90 + (cabin.lookUp ?? 25)) * DEG;
      if (cabin.lookYaw !== undefined) {
        const p = poseFor(cabin, view);
        const theta = new THREE.Spherical().setFromVector3(p.position.clone().sub(p.target)).theta;
        c.minAzimuthAngle = theta - cabin.lookYaw * DEG; // OrbitControls handles ranges across ±180°
        c.maxAzimuthAngle = theta + cabin.lookYaw * DEG;
      }
      return;
    }
    // Close-ups: look around at most lookRange degrees from the framed direction, so the eye (which
    // moves on a small sphere around the target) never swings into nearby trim.
    const p = poseFor(cabin, view);
    const s = new THREE.Spherical().setFromVector3(p.position.clone().sub(p.target));
    const r = cabin.lookRange * DEG;
    c.minPolarAngle = Math.max(0.01, s.phi - r);
    c.maxPolarAngle = Math.min(Math.PI - 0.01, s.phi + r);
    c.minAzimuthAngle = s.theta - r;
    c.maxAzimuthAngle = s.theta + r;
  };

  const scheduleAutoRotate = () => {
    window.clearTimeout(idleTimer.current);
    if (prefersReducedMotion()) return;
    idleTimer.current = window.setTimeout(() => {
      if (controls.current && mode.current === 'exterior' && !tween.current) controls.current.autoRotate = true;
    }, cfg.idleResumeMs);
  };

  const startTween = (to: Pose, duration: number, ease: Tween['ease'], onDone?: () => void, via?: Pose) => {
    const c = controls.current;
    if (!c) return;
    window.clearTimeout(idleTimer.current);
    c.autoRotate = false;
    c.enabled = false;
    if (prefersReducedMotion()) duration = 0;
    const from = { position: camera.position.clone(), target: c.target.clone(), fov: pc.fov, interior: mode.current === 'interior' };
    tween.current = { from, to, via, t: 0, duration, ease, onDone };
  };

  const goTo = (id: PresetId) => {
    const preset = cfg.presets[id];
    const cabin = preset.kind === 'interior' ? preset : null;
    if (!cabin) applyLimits(null); // widen limits before leaving the cabin
    const hop = cabin && mode.current === 'interior'; // cabin view -> cabin view
    // Sub-view to sub-view goes through the driver eye point: those spokes are the checked-clear paths.
    const driver = cfg.presets.interior;
    const via = hop && cabin !== driver && cabinPreset.current !== driver ? poseFor(driver, view) : undefined;
    useExperience.getState().setActivePreset(id);
    const duration = hop ? cfg.interiorMoveDuration * (via ? 1.5 : 1) : cfg.presetDuration;
    startTween(poseFor(preset, view), duration, easeInOutCubic, () => {
      applyLimits(cabin);
      scheduleAutoRotate();
    }, via);
  };

  // Intro: sweep in once the car is on screen.
  useEffect(() => {
    if (!ready || !controls.current) return;
    applyLimits(null);
    const from = poseFor(cfg.intro.from, view);
    camera.position.copy(from.position);
    controls.current.target.copy(from.target);
    useExperience.getState().setActivePreset(cfg.hero);
    startTween(poseFor(cfg.presets[cfg.hero], view), cfg.intro.duration, easeOutQuart, () => {
      useExperience.getState().setIntroDone();
      if (!prefersReducedMotion() && controls.current) controls.current.autoRotate = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Preset buttons and zoom buttons.
  useEffect(
    () =>
      useExperience.subscribe((s, prev) => {
        if (s.cameraRequest && s.cameraRequest !== prev.cameraRequest) goTo(s.cameraRequest.preset);
        if (s.zoomRequest && s.zoomRequest !== prev.zoomRequest && mode.current === 'exterior' && controls.current) {
          const c = controls.current;
          const offset = camera.position.clone().sub(c.target);
          const len = THREE.MathUtils.clamp(offset.length() * (s.zoomRequest.dir > 0 ? 0.8 : 1.25), c.minDistance, c.maxDistance);
          startTween({ position: c.target.clone().add(offset.setLength(len)), target: c.target.clone(), fov: pc.fov }, 0.6, easeInOutCubic, scheduleAutoRotate);
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view.distanceScale],
  );

  // Input policy on a scrolling page: plain wheel scrolls the page; Ctrl/⌘+wheel (and trackpad pinch,
  // which browsers report as ctrl+wheel) zooms. Capture-phase listeners at the target run before
  // OrbitControls' own listener, so stopping here keeps the wheel from reaching it.
  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) e.stopImmediatePropagation();
    };
    el.addEventListener('wheel', onWheel, { capture: true });
    return () => el.removeEventListener('wheel', onWheel, { capture: true });
  }, [gl]);

  // User interaction: stop auto-rotate / cancel tweens; resume rotate after idle.
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const onStart = () => {
      window.clearTimeout(idleTimer.current);
      c.autoRotate = false;
      if (mode.current === 'exterior') useExperience.getState().setActivePreset(null);
    };
    c.addEventListener('start', onStart);
    c.addEventListener('end', scheduleAutoRotate);
    return () => {
      c.removeEventListener('start', onStart);
      c.removeEventListener('end', scheduleAutoRotate);
      window.clearTimeout(idleTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exteriorNear = useRef(pc.near);
  useFrame((_, dt) => {
    // Inside the cabin surfaces can be a few cm away: shrink the near plane there only, so the
    // exterior keeps its depth precision (cabinFactor is exactly 0 outside).
    const near = THREE.MathUtils.lerp(exteriorNear.current, interior.nearPlane, cabinFactor(camera));
    if (Math.abs(pc.near - near) > 1e-5) {
      pc.near = near;
      pc.updateProjectionMatrix();
    }

    const tw = tween.current;
    const c = controls.current;
    if (!tw || !c) return;
    tw.t = tw.duration > 0 ? Math.min(1, tw.t + dt / tw.duration) : 1;
    const e = tw.ease(tw.t);
    if (tw.via) {
      // Two straight legs, split by length so speed stays even through the waypoint.
      const l1 = tw.from.position.distanceTo(tw.via.position), l2 = tw.via.position.distanceTo(tw.to.position);
      const split = l1 / Math.max(1e-6, l1 + l2);
      if (e < split) lerpPose(tw.from, tw.via, e / split, pose.current);
      else lerpPose(tw.via, tw.to, (e - split) / Math.max(1e-6, 1 - split), pose.current);
    } else lerpPose(tw.from, tw.to, e, pose.current);
    camera.position.copy(pose.current.position);
    c.target.copy(pose.current.target);
    camera.lookAt(c.target);
    if (pc.fov !== pose.current.fov) {
      pc.fov = pose.current.fov;
      pc.updateProjectionMatrix();
    }
    if (tw.t >= 1) {
      tween.current = null;
      // Drag momentum from before the tween lives in the controls' private state. Burn it off with
      // repeated damped updates, then restore the landed pose so the camera doesn't drift.
      c.enabled = true;
      for (let i = 0; i < 120; i++) c.update();
      camera.position.copy(tw.to.position);
      pc.fov = tw.to.fov;
      pc.updateProjectionMatrix();
      c.target.copy(tw.to.target);
      // onDone applies the destination's orbit limits; it must run before the settling update, or the
      // previous view's look-around clamp (e.g. pedals' azimuth range) rotates the landed camera.
      tw.onDone?.();
      c.update();
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={0.55}
      zoomSpeed={0.6}
      enablePan={false}
      autoRotateSpeed={cfg.autoRotateSpeed}
    />
  );
}
