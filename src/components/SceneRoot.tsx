'use client';

import dynamic from 'next/dynamic';

// three.js + the scene are client-only and code-split out of the initial page bundle.
const Experience = dynamic(() => import('./three/Experience'), { ssr: false });

/** The canvas layer. Its box (and so the car's framing) is set by the stage layout in globals.css. */
export function SceneRoot() {
  return (
    <div className="scene-layer">
      <Experience />
    </div>
  );
}
