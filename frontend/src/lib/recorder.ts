// src/lib/recorder.ts

const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

export async function recordAudio(
  audioCtx: AudioContext,
  startTime: number,     // audioCtx.currentTime + delaySec
  durationSec: number
): Promise<{ buffer: Float32Array; sampleRate: number }> {
  // load the worklet (make sure public/recorder-worklet.js is served)
  await audioCtx.audioWorklet.addModule('/recorder-worklet.js');
  const node = new AudioWorkletNode(audioCtx, 'recorder-processor');

  // hook up mic → worklet → speakers
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const src = audioCtx.createMediaStreamSource(stream);
  src.connect(node);
  node.connect(audioCtx.destination);

  const chunks: Float32Array[] = [];
  node.port.onmessage = (e) => {
    // clone the Float32Array
    chunks.push(new Float32Array(e.data as Float32Array));
  };

  // wait until our scheduled startTime
  const now = audioCtx.currentTime;
  const delayMs = Math.max(0, (startTime - now) * 1000);
  await sleep(delayMs);

  // start / stop
  console.log('[recorder] start recording at', audioCtx.currentTime);
  node.port.postMessage('start');
  await sleep(durationSec * 1000);
  node.port.postMessage('stop');

  // tear down
  src.disconnect(node);
  node.disconnect();
  stream.getTracks().forEach(t => t.stop());

  // flatten
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Float32Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }

  return { buffer: out, sampleRate: audioCtx.sampleRate };
}
