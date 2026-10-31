'use client';

import { useSyncExternalStore } from 'react';

const noop = () => () => {};

export type RecordParams = { record: boolean; ratio: '4x5' | null; tune: boolean };

/**
 * URL flags: `?record` (clean capture mode), `?record&ratio=4x5` (1080×1350 portrait framing),
 * `?tune` (dev tuning panel). Server render sees none of them.
 */
export function useRecordParams(): RecordParams {
  const search = useSyncExternalStore(noop, () => window.location.search, () => '');
  const q = new URLSearchParams(search);
  const record = q.has('record');
  return { record, ratio: record && q.get('ratio') === '4x5' ? '4x5' : null, tune: q.has('tune') };
}
