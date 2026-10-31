'use client';

import { exteriorViews, interiorViewLabels, interiorViews, isInteriorPreset, presetLabels, type PresetId } from '@/config/car';
import { useExperience } from '@/store/experience';

const ariaName = (id: PresetId, label: string) => `${id === 'threeQuarter' ? 'Three-quarter' : label} view`;

/**
 * Glass pill with camera presets and zoom. Keyboard accessible; current view is aria-pressed.
 * While the camera is in the cabin, a second row of interior views floats above the bar.
 */
export function ViewControls() {
  const active = useExperience((s) => s.activePreset);
  const introDone = useExperience((s) => s.introDone);
  const goTo = useExperience((s) => s.goTo);
  const zoom = useExperience((s) => s.zoom);
  const inCabin = isInteriorPreset(active);
  const recording = useExperience((s) => s.recording);

  return (
    <div className={`relative max-w-full transition-opacity duration-700 ${introDone ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
      {inCabin && (
        <nav
          aria-label="Interior views"
          className="glass pointer-events-auto absolute bottom-full left-1/2 mb-2 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto rounded-full p-1 whitespace-nowrap sm:gap-1 sm:p-1.5"
        >
          {interiorViews.map((id) => {
            const label = interiorViewLabels[id] ?? presetLabels[id];
            return (
              <button key={id} type="button" onClick={() => goTo(id)} aria-pressed={active === id} aria-label={ariaName(id, label)} className="view-btn">
                {label}
              </button>
            );
          })}
        </nav>
      )}
      <nav aria-label="Camera views" className="glass pointer-events-auto flex max-w-full items-center gap-0.5 rounded-full p-1 sm:gap-1 sm:p-1.5">
        {exteriorViews.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => goTo(id)}
            aria-pressed={id === 'interior' ? inCabin : active === id}
            aria-label={ariaName(id, presetLabels[id])}
            className="view-btn"
          >
            {presetLabels[id]}
          </button>
        ))}
        {/* Phones pinch to zoom; the buttons stay for mouse and keyboard users. Hidden in record mode. */}
        {!recording && (
          <>
            <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" aria-hidden />
            <button type="button" className="view-btn hidden w-9 px-0 sm:block" onClick={() => zoom(1)} disabled={inCabin} aria-label="Zoom in">
              +
            </button>
            <button type="button" className="view-btn hidden w-9 px-0 sm:block" onClick={() => zoom(-1)} disabled={inCabin} aria-label="Zoom out">
              −
            </button>
          </>
        )}
      </nav>
    </div>
  );
}
