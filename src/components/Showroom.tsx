'use client';

import { useRecordParams } from '@/hooks/useRecordParams';
import { RecordDirector } from './RecordDirector';
import { SceneRoot } from './SceneRoot';
import { HeroCopy } from './ui/HeroCopy';
import { Loader } from './ui/Loader';
import { ViewControls } from './ui/ViewControls';

/**
 * The hero "stage": a size container that frames the 3D canvas and the description.
 * Layout lives in globals.css (container queries on the stage, so the 4:5 record frame and
 * real portrait screens share one set of rules):
 *  - landscape: canvas covers the right ~60%, description in a left column;
 *  - portrait:  canvas covers the top ~56%, description below.
 * The canvas is resized rather than the camera offset, so orbiting and auto-rotate stay
 * centred on the car at every angle.
 */
export function Showroom() {
  const { record, ratio, tune } = useRecordParams();

  return (
    <div className="stage" data-ratio={ratio ?? undefined}>
      <SceneRoot />
      <HeroCopy />
      <div className="view-dock">
        <ViewControls />
      </div>
      {record && <RecordDirector tune={tune} />}
      <Loader />
    </div>
  );
}
