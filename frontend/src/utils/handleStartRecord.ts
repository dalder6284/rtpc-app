// src/utils/handleStartRecord.ts

import { recordAudio } from "@/lib/recorder";

export async function handleStartRecord(
  audioCtx: AudioContext,
  serverPlayTime: number,   // in seconds since UNIX epoch
  coarseOffsetSec: number,  // your half-RTT coarse sync, in seconds
  beaconDuration: number    // MLS length, in seconds (msg.duration)
): Promise<Float32Array> {
  // 1) compute when to start recording: 2×coarse before the beacon
  const prerollSec = 2 * coarseOffsetSec;
  const recordStartEpoch = serverPlayTime - prerollSec;

  // 2) how long to record: the beacon + 2×coarse
  const recordDuration = beaconDuration + prerollSec;

  // 3) figure out how many seconds from now that is
  const nowEpoch = (performance.timeOrigin + performance.now()) / 1000;
  const delaySec = recordStartEpoch - nowEpoch;

  // 4) schedule in AudioContext time
  const startAudioCtx = audioCtx.currentTime + Math.max(0, delaySec);

  // 5) record!
  const { buffer } = await recordAudio(
    audioCtx,
    startAudioCtx,
    recordDuration
  );

  return buffer;
}
