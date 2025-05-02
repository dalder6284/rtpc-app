import { createDevice, MIDIEvent, BaseDevice, IPatcher } from "@rnbo/js";

let device: BaseDevice | null = null;
let deviceIsReady = false;

export async function setupDevice(
  context: AudioContext,
  patcher: IPatcher,
): Promise<void> {
  try {
    // Disconnect existing device
    if (device) {
      try {
        device.node.disconnect();
      } catch (e) {
        console.warn("Couldn't disconnect old device:", e);
      }
      device = null;
      deviceIsReady = false;
      console.log("Old device cleaned up.");
    }

    // Create new device
    device = await createDevice({ context, patcher });
    device.node.connect(context.destination);
    deviceIsReady = true;

    console.log("Device ready. Parameters:");
    // device.parameters.forEach(p => console.log(p.id, p.name));
  } catch (err) {
    console.error("setupDevice error:", err);
    throw err;
  }
}

export function playNote(pitch: number, context: AudioContext): void {
  if (!deviceIsReady || !device) return;

  const midiChannel = 0;
  const durationMs = 250;
  const now = context.currentTime;

  const noteOn = new MIDIEvent(now * 1000, 0, [144 + midiChannel, pitch, 100]);
  const noteOff = new MIDIEvent((now + durationMs / 1000) * 1000, 0, [128 + midiChannel, pitch, 0]);

  device.scheduleEvent(noteOn);
  device.scheduleEvent(noteOff);
}

export function sendMIDI(
  pitch: number,
  velocity: number,
  durationInBeats: number,
  onBeat: number,
  bpm: number,
  timeNow: number,
  beatZeroTime: number,
  context: AudioContext,
  midiChannel = 0,
  midiPort = 0
): void {
  if (!deviceIsReady || !device) return;

  const beatDurationMs = (60 * 1000) / bpm;
  const scheduledMs = beatZeroTime + (onBeat * beatDurationMs);
  const delay = scheduledMs - timeNow;

  if (delay < 0) {
    console.warn(`Note at beat ${onBeat} is already in the past. Skipping.`);
    return;
  }

  const durationMs = durationInBeats * beatDurationMs;
  const baseTime = context.currentTime * 1000;

  const noteOn = new MIDIEvent(baseTime + delay, midiPort, [0x90 + midiChannel, pitch, velocity]);
  const noteOff = new MIDIEvent(baseTime + delay + durationMs, midiPort, [0x80 + midiChannel, pitch, 0]);

  device.scheduleEvent(noteOn);
  device.scheduleEvent(noteOff);
}

export function notationToBeats(notation: string): number {
  const baseMap: Record<string, number> = {
    "1n": 4, "2n": 2, "4n": 1, "8n": 0.5, "16n": 0.25, "32n": 0.125,
  };
  const tripletMap: Record<string, number> = {
    "4t": 2 / 3, "8t": 1 / 3, "16t": 1 / 6, "32t": 1 / 12,
  };
  const dottedMap: Record<string, number> = {
    "2nd": 3, "4nd": 1.5, "8nd": 0.75, "16nd": 0.375,
  };

  return (baseMap[notation] ?? tripletMap[notation] ?? dottedMap[notation] ?? parseFloat(notation)) || 1;
}

export function isDeviceReady(): boolean {
  return deviceIsReady;
}