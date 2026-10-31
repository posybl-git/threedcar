import { create } from 'zustand';
import { defaultPaint, defaultRim, type PresetId, type QualityTier } from '@/config/car';

type CameraRequest = { preset: PresetId; nonce: number };

type ExperienceState = {
  paint: string;
  rim: string;
  tier: QualityTier;
  /** When true, setTier is ignored (record mode: no PerformanceMonitor changes mid-take). */
  tierLocked: boolean;
  /** `?record` URL mode: clean overlays, scripted camera path. */
  recording: boolean;
  /** Scene assets are loaded and the first frame is on screen. */
  ready: boolean;
  /** Intro camera move finished (or skipped). */
  introDone: boolean;
  /** Last preset the camera moved to; null once the user orbits freely. */
  activePreset: PresetId | null;
  cameraRequest: CameraRequest | null;
  zoomRequest: { dir: 1 | -1; nonce: number } | null;
  setPaint: (id: string) => void;
  setRim: (id: string) => void;
  setTier: (tier: QualityTier) => void;
  /** Pin the quality tier; later setTier calls (auto-detection, PerformanceMonitor) are ignored. */
  lockTier: (tier: QualityTier) => void;
  setRecording: (recording: boolean) => void;
  setReady: () => void;
  setIntroDone: () => void;
  setActivePreset: (id: PresetId | null) => void;
  goTo: (preset: PresetId) => void;
  zoom: (dir: 1 | -1) => void;
};

let nonce = 0;

export const useExperience = create<ExperienceState>((set) => ({
  paint: defaultPaint,
  rim: defaultRim,
  tier: 2,
  tierLocked: false,
  recording: false,
  ready: false,
  introDone: false,
  activePreset: null,
  cameraRequest: null,
  zoomRequest: null,
  setPaint: (paint) => set({ paint }),
  setRim: (rim) => set({ rim }),
  setTier: (tier) => set((s) => (s.tierLocked ? s : { tier })),
  lockTier: (tier) => set({ tier, tierLocked: true }),
  setRecording: (recording) => set({ recording }),
  setReady: () => set({ ready: true }),
  setIntroDone: () => set({ introDone: true }),
  setActivePreset: (activePreset) => set({ activePreset }),
  goTo: (preset) => set({ cameraRequest: { preset, nonce: ++nonce } }),
  zoom: (dir) => set({ zoomRequest: { dir, nonce: ++nonce } }),
}));
