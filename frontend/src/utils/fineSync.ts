// src/utils/fineSync.ts

import referenceBeaconData from "@/assets/reference_signal.json";
const referenceBeacon = new Float32Array(referenceBeaconData);

/** simple cross‐correlation */
export function crossCorrelate(x: Float32Array, y: Float32Array): Float32Array {
  const n = x.length, m = y.length, L = n - m + 1;
  const out = new Float32Array(L);
  for (let k = 0; k < L; k++) {
    let s = 0;
    for (let i = 0; i < m; i++) s += y[i] * x[k + i];
    out[k] = s;
  }
  return out;
}

export function argMax(a: Float32Array): number {
  let best = 0, bv = -Infinity;
  a.forEach((v,i) => { if (v > bv) { bv=v; best=i } });
  return best;
}

/**
 * @returns 
 *  beaconIndex: number of samples into buffer where the beacon peaks
 *  fineOffsetSec:   (arrivalTime - preroll)  in seconds
 */
export function estimateFineOffset(
  buffer: Float32Array,
  sampleRate: number,
  coarseOffsetSec: number
): { beaconIndex: number; fineOffsetSec: number } {
  const corr = crossCorrelate(buffer, referenceBeacon);
  const idx  = argMax(corr);

  // time from record-start to beacon-peak
  const arrivalSec = idx / sampleRate;

  // true fine offset = arrivalSec - coarseOffsetSec
  const fineOffsetSec = arrivalSec - coarseOffsetSec;

  return { beaconIndex: idx, fineOffsetSec };
}
