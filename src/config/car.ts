/**
 * AURA: single source of truth for brand copy, specs, configurator options,
 * material tuning, camera presets and render quality.
 *
 * Coordinates are metres, in the car's re-centred space:
 *   +Z = front of the car, +X = car's left side, +Y = up, floor at y = 0.
 * Camera presets use spherical coords around `target`:
 *   azimuth   degrees around Y, 0 = looking at the front, 90 = left side, 180 = rear
 *   polar     degrees from straight up (90 = level with target)
 *   distance  metres from target (auto-scaled up on narrow/portrait screens)
 */

import assets from './assets.generated.json';

export type Vec3 = [number, number, number];

// ---------------------------------------------------------------------------
// Brand & copy

export const brand = {
  name: 'AURA',
  model: 'AURA GT',
  tagline: 'Engineered to be felt.',
  cta: 'Book a Private Viewing',
};

export type Stat = { value: number; decimals?: number; unit: string; label: string };

/** Hero product description (overlay beside / below the car). */
export const hero = {
  eyebrow: 'AURA GT — Concept 01',
  headline: 'Engineered to be felt.',
  subheadline: 'A two-tone electric grand tourer built around one idea: every line should earn its place.',
  body: 'AURA GT pairs a sculpted carbon body with a centre-seat cabin that puts the driver at the heart of the machine. Hand-finished candy paint, aerodynamic wheels and a cockpit designed with zero distraction.',
  stats: [
    { value: 620, unit: 'km', label: 'Range' },
    { value: 3.2, decimals: 1, unit: 's', label: '0–100 km/h' },
    { value: 480, unit: 'kW', label: 'Peak power' },
  ] satisfies Stat[],
  primaryCta: { label: 'Book a Private Viewing', href: '#book' },
  /** Will open the planned 360° viewer; until then it moves the camera to this preset. */
  secondaryCta: { label: 'Explore 360°', preset: 'side' as const },
  hint: 'Drag to rotate · Pinch to zoom',
  /** Text reveal after the intro sweep: per-item duration and stagger (ms). */
  reveal: { duration: 600, stagger: 90 },
  countUpMs: 1400,
};

/** `?record` mode (LinkedIn capture): scripted camera path after the description appears. */
export const recording = {
  /** Seconds per shot (camera move + hold). The move itself takes `camera.presetDuration`. */
  shotSeconds: 4,
  /** The intro already lands on ¾, so the path continues from there and ends back on ¾,
   *  after which OrbitControls' idle auto-rotate takes over. */
  path: ['front', 'side', 'rear', 'threeQuarter'] as const,
};

export const specs = [
  { label: 'Range (WLTP)', value: 620, unit: 'km' },
  { label: 'Peak power', value: 480, unit: 'kW' },
  { label: '0–100 km/h', value: 3.2, unit: 's', decimals: 1 },
  { label: 'Top speed', value: 265, unit: 'km/h' },
  { label: 'Charge 10–80%', value: 18, unit: 'min' },
  { label: 'Drag coefficient', value: 0.21, unit: 'Cd', decimals: 2 },
];

// ---------------------------------------------------------------------------
// Model

export const model = {
  /** Built by `npm run build:model` from the untouched original `car.glb`; content-hashed file name. */
  url: assets.model,
  /** Re-centres the car over the origin (the raw model sits ~0.24 m forward). */
  offset: [0, 0, -0.24] as Vec3,
  /** Material names in the GLB. */
  materials: {
    bodyPaint: 'Paint 1 Carmine', // main body: recoloured by the configurator
    accentPaint: 'Paint 2 Carmine', // roof, lower sides, grille, door lowers: fixed gloss graphite
    glass: 'Glass',
    rimFace: 'Rim1', // rim spokes: finish selectable in configurator
    rimChrome: 'Rim2',
    tyreSide: 'Tireside',
    tyreTread: 'Tiretread',
    mirror: 'Mirror',
    headlight: 'Headlight',
    brakelight: 'Brakelight',
  },
};

// ---------------------------------------------------------------------------
// Configurator

export type PaintOption = {
  id: string;
  name: string;
  /** sRGB hex */
  color: string;
  metalness: number;
  roughness: number;
  clearcoatRoughness: number;
};

export const paints: PaintOption[] = [
  { id: 'aurora-silver', name: 'Aurora Silver', color: '#b9bec4', metalness: 0.95, roughness: 0.32, clearcoatRoughness: 0.03 },
  { id: 'carmine', name: 'Carmine Red', color: '#8e0a12', metalness: 0.9, roughness: 0.3, clearcoatRoughness: 0.03 },
  { id: 'abyss-blue', name: 'Abyss Blue', color: '#0f2a4f', metalness: 0.9, roughness: 0.32, clearcoatRoughness: 0.03 },
  { id: 'glacier-white', name: 'Glacier White', color: '#e6e7e3', metalness: 0.15, roughness: 0.38, clearcoatRoughness: 0.04 },
  { id: 'obsidian', name: 'Obsidian Black', color: '#0b0c0e', metalness: 0.85, roughness: 0.3, clearcoatRoughness: 0.02 },
  { id: 'verdant', name: 'Verdant Green', color: '#1f3b2c', metalness: 0.9, roughness: 0.33, clearcoatRoughness: 0.03 },
];
export const defaultPaint = 'aurora-silver';

/** Fixed gloss graphite for the `accentPaint` panels (two-tone design). */
export const accentPaint = { color: '#1b1c1f', metalness: 0.6, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.04 };

export type RimOption = { id: string; name: string; color: string; metalness: number; roughness: number };

export const rims: RimOption[] = [
  { id: 'gloss-black', name: 'Gloss Black', color: '#0a0a0b', metalness: 0.2, roughness: 0.18 },
  { id: 'satin-graphite', name: 'Satin Graphite', color: '#3a3c40', metalness: 0.85, roughness: 0.42 },
  { id: 'brushed-silver', name: 'Brushed Silver', color: '#c4c7cc', metalness: 1, roughness: 0.28 },
];
export const defaultRim = 'gloss-black';

/** Duration (s) of the paint / rim colour blend. */
export const materialBlend = 0.9;

// ---------------------------------------------------------------------------
// Material tuning (shared)

export const materials = {
  paint: {
    clearcoat: 1,
    /** Flake tiling across the body UVs (GLB default 30). Higher = finer flakes, less moiré. */
    flakeRepeat: 60,
    /** Metal-flake normal strength up close, and the camera distances over which it fades. */
    flakeNormalScale: 0.07,
    flakeFadeNear: 3,
    flakeFadeFar: 8,
    flakeNormalScaleFar: 0.025,
  },
  /** envMapIntensity: reflection strength relative to the scene environment (1 = same as paint). */
  glass: { tint: '#a9b6bd', ior: 1.5, thickness: 0.004, roughness: 0.02, transmission: 1, opacityFallback: 0.35, envMapIntensity: 0.35 },
  chrome: { metalness: 1, roughness: 0.06 },
  tyre: { roughness: 0.88 },
};

// ---------------------------------------------------------------------------
// Rendering

export const render = {
  background: '#060607',
  environment: {
    /** Pre-filtered by `npm run build:hdri` from the original studio.hdr (removes moiré-prone detail);
     *  content-hashed file name. */
    files: assets.environment,
    intensity: 1.0,
    /** Euler XYZ, radians: rotate the studio lights around the car. */
    rotation: [0, -0.6, 0] as Vec3,
    /** Masks the HDRI's white floor in reflections (matches our dark floor). */
    groundColor: '#050506',
    /** Masks the HDRI's patterned ceiling above atan(height / radius) elevation. */
    ceiling: { height: 3.2, radius: 4, color: '#0a0a0b' },
    /** Overhead softbox strip, long axis along the car (x = width, y = length in metres). */
    softbox: { intensity: 1.6, scale: [2.6, 9, 1] as Vec3 },
  },
  /** 'aces' | 'agx' */
  toneMapping: 'aces' as 'aces' | 'agx',
  fog: { near: 10, far: 26 },
  /** envMapIntensity stays low: at grazing angles the floor would otherwise mirror the studio's white cyc. */
  /** The reflection is multiplied by `color` in drei's shader, so color sets how visible the car's reflection is. */
  floor: { color: '#34343a', roughness: 0.8, metalness: 0.4, envMapIntensity: 0.05, mixStrength: 9, mixBlur: 0.7, blur: [140, 40] as [number, number], mirror: 0.0 },
  contactShadow: { opacity: 0.9, blur: 2.6, far: 1.4, scale: [6.4, 8.2] as [number, number] },
  /** Threshold is HDR luminance before tone mapping: lamps (~5–10) bloom, paint reflections mostly don't. */
  bloom: { intensity: 0.3, threshold: 3, smoothing: 0.4, radius: 0.5 },
  vignette: { offset: 0.28, darkness: 0.55 },
};

export type QualityTier = 0 | 1 | 2; // 0 = low, 1 = medium, 2 = high

export const quality = {
  dpr: { 0: 1, 1: 1.5, 2: 2 } as Record<QualityTier, number>,
  reflectorResolution: { 0: 256, 1: 512, 2: 1024 } as Record<QualityTier, number>,
  shadowResolution: { 0: 512, 1: 1024, 2: 1024 } as Record<QualityTier, number>,
  msaa: { 0: 0, 1: 0, 2: 4 } as Record<QualityTier, number>,
  bloom: { 0: false, 1: true, 2: true } as Record<QualityTier, boolean>,
  /** Real refraction through glass costs an extra scene render; low tier uses plain transparency. */
  glassTransmission: { 0: false, 1: true, 2: true } as Record<QualityTier, boolean>,
};

// ---------------------------------------------------------------------------
// Camera

export type ExteriorPreset = { kind: 'orbit'; target: Vec3; azimuth: number; polar: number; distance: number };
/** Interior: camera fixed at the driver's eye point, looking around in place. */
export type InteriorPreset = {
  kind: 'interior';
  position: Vec3;
  lookAt: Vec3;
  /** Vertical FOV, degrees. Close-ups stay at 38–45° (natural lens, no wide-angle distortion). */
  fov: number;
  /** Dragging orbits a point this far ahead of the eye (m); smaller = the eye moves less (tight spaces). */
  orbitRadius?: number;
  /** Max look-around from the preset direction, degrees (yaw and pitch), for close-ups. */
  lookRange?: number;
  /** Driver-style limits instead of lookRange: max yaw either side of forward, max pitch above the
   *  horizon (looking down is always allowed to 35°). */
  lookYaw?: number;
  lookUp?: number;
};
export type CameraPreset = ExteriorPreset | InteriorPreset;

export const camera = {
  fov: 30,
  orbitTarget: [0, 0.52, 0] as Vec3,
  minDistance: 3.6,
  maxDistance: 9.5,
  /** Degrees from straight up; max keeps the camera above the floor. */
  minPolar: 18,
  maxPolar: 86,
  autoRotateSpeed: 0.45, // OrbitControls units: 2 = one turn per 30 s
  idleResumeMs: 5000,
  presetDuration: 1.6,
  intro: {
    duration: 3.2,
    from: { kind: 'orbit', target: [0, 0.4, 0], azimuth: 150, polar: 84, distance: 13 } as ExteriorPreset,
  },
  presets: {
    threeQuarter: { kind: 'orbit', target: [0, 0.52, 0], azimuth: 38, polar: 74, distance: 6.4 },
    front: { kind: 'orbit', target: [0, 0.5, 0], azimuth: 0, polar: 80, distance: 6.2 },
    side: { kind: 'orbit', target: [0, 0.5, 0], azimuth: 90, polar: 82, distance: 6.8 },
    rear: { kind: 'orbit', target: [0, 0.55, 0], azimuth: 180, polar: 76, distance: 6.2 },
    // Driver view. Framing unchanged; orbitRadius 0.08 keeps the eye from swinging into the pillars
    // when dragging (at 0.2 it could reach 1 cm from the A-pillar). The roof behind the windscreen
    // has no lining, so look-around is limited to where it stays out of frame (ray-cast checked:
    // forward ±35° yaw, up to 15° above the horizon, at aspect ratios up to 1.45).
    interior: { kind: 'interior', position: [0, 0.94, 0.04], lookAt: [0, 0.74, 1.3], fov: 58, orbitRadius: 0.08, lookYaw: 35, lookUp: 15 },
    // Interior sub-presets (reachable from the Interior view). Ray-cast checked against the cabin:
    // every eye point, drag extreme and straight move to/from the driver view keeps ≥ 4 cm clearance,
    // above the 2 cm near plane used inside (interior.nearPlane). Moves between two sub-presets
    // route through the driver eye point.
    dash: { kind: 'interior', position: [0, 0.9, 0.6], lookAt: [0, 0.73, 1.16], fov: 38, orbitRadius: 0.06, lookRange: 30 },
    pedals: { kind: 'interior', position: [0.25, 0.48, 0.82], lookAt: [0.02, 0.23, 1.29], fov: 48, orbitRadius: 0.05, lookRange: 25 },
    door: { kind: 'interior', position: [0.3, 0.9, 0.75], lookAt: [0.85, 0.64, 0.05], fov: 45, orbitRadius: 0.05, lookRange: 25 },
    controls: { kind: 'interior', position: [0.34, 0.72, 0.55], lookAt: [0.12, 0.6, 0.86], fov: 40, orbitRadius: 0.05, lookRange: 30 },
  } satisfies Record<string, CameraPreset>,
  /** Interior sub-preset move duration (s): shorter hops inside the cabin. */
  interiorMoveDuration: 1.2,
  /** Preset shown after the intro. */
  hero: 'threeQuarter' as const,
};

export type PresetId = keyof typeof camera.presets;
export const presetLabels: Record<PresetId, string> = {
  front: 'Front',
  side: 'Side',
  rear: 'Rear',
  threeQuarter: '¾',
  interior: 'Interior',
  dash: 'Dashboard',
  pedals: 'Pedals',
  door: 'Door',
  controls: 'Wheel',
};

/** Main view bar (exterior presets + the way into the cabin). */
export const exteriorViews: PresetId[] = ['threeQuarter', 'front', 'side', 'rear', 'interior'];
/** Second row, shown while in the cabin. 'interior' is the driver view. */
export const interiorViews: PresetId[] = ['interior', 'dash', 'pedals', 'door', 'controls'];
export const interiorViewLabels: Partial<Record<PresetId, string>> = { interior: 'Driver' };
export const isInteriorPreset = (id: PresetId | null) => !!id && camera.presets[id].kind === 'interior';

// ---------------------------------------------------------------------------
// Interior (cabin) look. Applies to Interior* meshes only; the exterior is untouched.

export const interior = {
  /** Cabin lights fade in as the camera nears this point: off beyond fadeFar, full within fadeNear (m). */
  cabinCenter: [0, 0.75, 0.3] as Vec3,
  fadeNear: 0.9,
  fadeFar: 1.8,
  /** Soft overhead area light under the roof, aimed slightly forward at the dash and wheel. */
  overhead: { position: [0, 1.06, -0.15] as Vec3, lookAt: [0, 0.45, 0.75] as Vec3, width: 0.9, height: 0.7, intensity: 9, color: '#fff3e6' },
  /** Weak fill as if daylight came through the windscreen (spot, limited reach so it stays in the cabin). */
  windscreen: { position: [0, 1.02, 1.55] as Vec3, target: [0, 0.5, 0.2] as Vec3, intensity: 2.5, distance: 2.4, angle: 0.95, penumbra: 1, color: '#f2f5ff' },
  /**
   * Code-built rear-view mirror, mounted on the windscreen ahead of the centre seat. The stem is
   * sized at runtime to reach the glass. Housing uses the cabin's soft-touch material.
   */
  mirror: {
    center: [0, 0.99, 0.48] as Vec3, // housing centre; faces the driver's eye (camera.presets.interior)
    size: [0.22, 0.056, 0.028] as Vec3, // width, height, depth (m)
    cornerRadius: 0.014,
    glassTint: '#3a3e44',
    /** × scene environment. Low because the mirror faces the bright studio behind the car and the
     *  environment map knows nothing about the cabin that would block most of it. */
    glassReflection: 0.22,
  },
  /** Camera near plane inside the cabin (m); exterior keeps the Canvas default 0.05. */
  nearPlane: 0.02,
  /** While inside: glass reflects less (stays clear), bloom picks up the gauges gently. */
  glassEnvMapIntensity: 0.08,
  bloom: { threshold: 1.4, intensity: 0.25 },
  materials: {
    leather: { roughness: 0.55, sheen: 0.35, sheenRoughness: 0.45 }, // seats, steering-wheel rim, door inserts
    softTouch: { roughness: 0.82 }, // dashboard / door-card plastics
    satin: { roughness: 0.42 }, // trim: cage, seat frames, steering column, pillars
    aluminium: { metalness: 1, roughness: 0.3, anisotropy: 0.6 }, // pedal arms, paddles, door latch
    rubber: { roughness: 0.7 }, // pedal pads, floor mats (a little sheen shows the tread relief)
    gaugeEmissiveIntensity: 2, // keeps the gauges amber after tone mapping instead of washing to cream
    gaugeRoughness: 0.6, // housing: no hard highlight band from the cabin light
  },
};
