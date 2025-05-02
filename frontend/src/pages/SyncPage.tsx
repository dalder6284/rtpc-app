// src/pages/SyncPage.tsx
import { useEffect, useState, useRef } from "react"
import { useWebSocket } from "@/context/useWebSocket"
import { useNavigate } from "react-router-dom"
import type {
  TimeRequestMessage,
  TimeSyncMessage,
  // RecordMessage,
  // RejoinRequestMessage,
} from "@/types/MessageTypes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Check } from "lucide-react"
// import { recordAudio } from "@/lib/recorder";
// import { crossCorrelate, argMax } from "@/utils/fineSync"

// import referenceBeaconData from "@/assets/reference_signal.json";



export default function SyncPage() {
  const { connected, send, onMessage } = useWebSocket()
  const navigate = useNavigate()

  const [minRtt, setMinRtt] = useState<number | null>(null)
  const [offset, setOffset] = useState<number>(0)
  const [tolerance, setTolerance] = useState<number>(0)
  const [serverTime, setServerTime] = useState<number>(Date.now())
  const [syncing, setSyncing] = useState<boolean>(true)
  const [syncComplete, setSyncComplete] = useState<boolean>(false)
  // const [micReady, setMicReady] = useState<boolean>(false)
  // const [recordMsg, _setRecordMsg] = useState<RecordMessage | null>(null)
  // const [currentNote, setCurrentNote] = useState<string | null>(null);


  const audioCtxRef = useRef<AudioContext | null>(null)
  const rttsRef = useRef<number[]>([])

  // create the AudioContext once on mount
  useEffect(() => {
    console.log("[SyncPage] Creating AudioContext...");
    // Use the declared global type
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;

    // Attempt to resume immediately - may still require user gesture
    console.log("[SyncPage] Attempting to resume AudioContext on mount...");
    ctx.resume().then(() => {
      console.log("[SyncPage] AudioContext resumed successfully on mount.");
    }).catch(e => {
      console.warn("[SyncPage] AudioContext resume failed initially (requires user gesture):", e);
    });


    return () => {
      // Clean up AudioContext on unmount
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        console.log("[SyncPage] Closing AudioContext...");
        audioCtxRef.current.close().catch(e => console.error("[SyncPage] Error closing AudioContext:", e));
      }
    };
  }, []) // Empty dependency array means this runs once on mount


  // Redirect back to Login if WS never connects
  useEffect(() => {
    if (connected) return
    const t = setTimeout(() => {
      console.warn("WebSocket not connected after 5s, redirecting to login.");
      navigate("/");
    }, 5000);
    return () => clearTimeout(t);
  }, [connected, navigate]);

  // Initialize microphone and recorder
  // Not needed for now since fine sync was unsuccessful but kept for reference
  // useEffect(() => {
  //   // Only proceed if AudioContext is ready and mic isn't ready yet
  //   if (!audioCtxRef.current || micReady) {
  //     if (!audioCtxRef.current) console.log("[SyncPage] Waiting for AudioContext before initializing mic.");
  //     if (micReady) console.log("[SyncPage] Mic already ready, skipping initialization.");
  //     return;
  //   }

  //   console.log("[SyncPage] Attempting to initialize microphone and recorder...");
  //   navigator.mediaDevices
  //     .getUserMedia({ audio: true })
  //     .then(async (stream) => {
  //       console.log("[SyncPage] Microphone access granted.");
  //       setMicReady(true);
  //       // Stop tracks immediately after getting access, initRecorder will handle actual use
  //       stream.getTracks().forEach((t) => t.stop());
  //       // Pass the AudioContext to initRecorder
  //       // await initRecorder(audioCtxRef.current!); // Pass audioCtx to initRecorder
  //       console.log("[SyncPage] Recorder initialized.");
  //     })
  //     .catch((err) => {
  //       console.error("[SyncPage] Microphone access denied:", err);
  //       setMicReady(false);
  //       // Potentially navigate away or show an error if mic is required
  //       // You might want to inform the user they need to grant microphone access
  //     });
  //   // Dependency on audioCtxRef.current ensures this runs after context is created
  // }, [micReady]); // Re-run if AudioContext becomes available or micReady state changes


  // Attempt rejoin based on localStorage
  // useEffect(() => {
  //   if (!connected) return
  //   const id = localStorage.getItem("client_id")
  //   const exp = localStorage.getItem("client_expires_at")
  //   // Check if ID exists and is not expired
  //   if (id && exp && Date.now() < Number(exp)) {
  //     console.log("[SyncPage] Attempting rejoin with ID", id);
  //     // Note: Server needs to handle 'rj' message and respond appropriately,
  //     // potentially skipping coarse sync if rejoin is successful and sending
  //     // a 'start_record' or 'synced' message. The current flow will still
  //     // proceed with coarse sync if the server doesn't signal success/completion.
  //     send({ type: "rj", id } as RejoinRequestMessage);
  //   } else {
  //     console.log("[SyncPage] No valid client ID found for rejoin or expired.");
  //   }
  //   // Dependencies: connected, send. Reruns if connection status changes.
  // }, [connected, send]);


  // Coarse sync: send requests until RTT < threshold
  useEffect(() => {
    if (!connected || (!syncing && minRtt !== null)) return;

    console.log("[SyncPage] Starting coarse synchronization...");
    setSyncing(true);

    const THRESHOLD = 15;
    let timerId: ReturnType<typeof setTimeout> | undefined;
    const syncInterval = 500;

    const handleSync = (msg: TimeSyncMessage) => {
      if (msg.type !== "tq_result") return;

      const now = Date.now();
      const rtt = now - msg.client_time;
      console.debug(`[SyncPage] RTT sample: ${rtt} ms`);

      rttsRef.current.push(rtt); // Store RTT sample

      const m = Math.min(...rttsRef.current);
      setMinRtt(m);

      const tol = m / 2;
      setTolerance(tol);

      const off = msg.server_time + tol - now;
      setOffset(off);
      setServerTime(now + off);

      if (rtt < THRESHOLD) {
        console.log(`[SyncPage] Coarse sync complete (Min RTT ${m}ms, final offset ${off.toFixed(1)}ms)`);
        clearTimeout(timerId);
        setSyncing(false);
        setSyncComplete(true);
      } else {
        scheduleSendReq();
      }
    };

    onMessage<TimeSyncMessage>(handleSync);

    const sendReq = () => {
      if (!connected) return;
      const ts = Date.now();
      console.debug(`[SyncPage] Sending time_request at ${new Date(ts).toLocaleTimeString()}`);
      send({ type: "time_request", client_time: ts } as TimeRequestMessage);
    };

    const scheduleSendReq = () => {
      const jitter = syncInterval + (Math.random() - 0.5) * 200;
      timerId = setTimeout(sendReq, jitter);
    }

    sendReq();

    return () => {
      clearTimeout(timerId);
    };
  }, [connected, send, onMessage, minRtt, syncing]);


  // Listen for record start AFTER coarse sync is complete and mic is ready
  // inside SyncPage.tsx, replace your “Listen for start_record” effect with this:
  // I used this for testing to get a tone to play at the same time. I would record the
  // audio on my laptop to see how the tones lined up.

  // Originally, start_record was used for recording the beacon, but this proved too
  // difficult to get right. So, we're keeping coarse sync for now.

  // useEffect(() => {
  //   if (syncing || !micReady || !audioCtxRef.current) return;

  //   // const audioCtx = audioCtxRef.current;
  //   // const coarseOffsetSec = offset / 1000;  // your coarse offset (ms → s)

  //   onMessage<RecordMessage>(async (msg) => {
  //     // inside your SyncPage’s onMessage<RecordMessage>…

  //     if (msg.type === "start_record") {
  //       console.log("[SyncPage] 🔔 Got start_record (coarse tone schedule):", msg);

  //       const audioCtx = audioCtxRef.current!;
  //       const coarseOffsetSec = offset / 1000;   // your coarse offset in seconds
  //       const delayAfterBeaconSec = 15;          // seconds after beacon to play tone

  //       // 1) Compute when the tone _should_ play on the server
  //       const targetToneServerSec = msg.play_time + delayAfterBeaconSec;

  //       // 2) Map that to our _client_ epoch using only the coarse offset
  //       const targetToneClientEpochSec =
  //         targetToneServerSec - coarseOffsetSec;

  //       // 3) Turn that into an AudioContext timestamp
  //       //    Snapshot our wall-clock right now:
  //       const nowEpochSec = Date.now() / 1000;
  //       //    Figure out how many seconds from now:
  //       const untilToneSec = targetToneClientEpochSec - nowEpochSec;
  //       //    And schedule relative to audioCtx.currentTime:
  //       const startToneAudioCtx =
  //         audioCtx.currentTime + Math.max(0, untilToneSec);

  //       console.log(
  //         `[SyncPage] Scheduling A4 @440Hz:` +
  //         ` server@${targetToneServerSec.toFixed(3)}s,` +
  //         ` client@${targetToneClientEpochSec.toFixed(3)}s,` +
  //         ` in ${untilToneSec.toFixed(3)}s → AudioCtx@${startToneAudioCtx.toFixed(3)}s`
  //       );

  //       // 4) Create & schedule the oscillator
  //       const osc = audioCtx.createOscillator();
  //       const NOTES = {
  //         C: 261.63,
  //         D: 293.66,
  //         E: 329.63,
  //         F: 349.23,
  //         G: 392.00
  //       };
  //       const noteNames = Object.keys(NOTES) as (keyof typeof NOTES)[];
  //       const chosenNote = noteNames[Math.floor(Math.random() * noteNames.length)];
  //       osc.frequency.value = NOTES[chosenNote];
  //       setCurrentNote(chosenNote);
  //       console.log(`[SyncPage] Playing random note: ${chosenNote} (${NOTES[chosenNote]} Hz)`);

  //       osc.connect(audioCtx.destination);

  //       const toneDurationSec = 2; // play for 2 seconds
  //       const baseLatency = audioCtx.baseLatency || 0.01;

  //       const nowAudioCtx = audioCtx.currentTime;
  //       const timeUntil = startToneAudioCtx - nowAudioCtx;

  //       if (timeUntil > baseLatency) {
  //         osc.start(startToneAudioCtx);
  //         osc.stop(startToneAudioCtx + toneDurationSec);
  //         console.log(`[SyncPage] Tone scheduled in ${timeUntil.toFixed(3)}s`);
  //       } else {
  //         console.warn(
  //           `[SyncPage] Too late to schedule by ${timeUntil.toFixed(3)}s; playing now.`
  //         );
  //         osc.start(nowAudioCtx);
  //         osc.stop(nowAudioCtx + toneDurationSec);
  //       }

  //       osc.onended = () => {
  //         osc.disconnect();
  //         console.log("[SyncPage] Coarse-scheduled A4 tone ended.");
  //       };
  //     }

  //   });

  //   return () => {
  //     console.log("[SyncPage] cleaning up start_record listener");
  //   };
  // }, [syncing, micReady, offset, onMessage]);



  // Update serverTime locally after coarse sync (and later, after fine sync updates offset)
  // This effect is purely for updating the display of the estimated server time
  useEffect(() => {
    // Update display time using the current offset (coarse or fine)
    // Only run the interval if we are connected.
    if (!connected) {
      console.log("[SyncPage] Server time display interval skipped: not connected.");
      return;
    }

    // Update the displayed server time every second based on the current offset
    const intervalId = setInterval(() => {
      // Use a functional update to get the latest 'offset' state value
      setServerTime(Date.now() + offset);
    }, 1000);

    // Cleanup interval
    return () => {
      console.log("[SyncPage] Cleaning up server time display interval.");
      clearInterval(intervalId);
    };

  }, [connected, offset]); // Rerun if connection status or offset changes


  // Effect to log offset changes (for debugging)
  useEffect(() => {
    console.log(`[SyncPage] Offset state updated to: ${offset.toFixed(1)} ms`);
    // This will log updates from both coarse and fine sync
  }, [offset]);


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 px-4">
      {/* Resume AudioContext button */}
      {/* Important: Needed because browsers require user gesture to start audio playback */}
      {/* This button helps ensure AudioContext state is 'running' */}
      <Button
        className="fixed top-4 right-4"
        onClick={() => {
          if (audioCtxRef.current && audioCtxRef.current.state !== 'running') {
            console.log("[SyncPage] Attempting to resume AudioContext via button...");
            audioCtxRef.current.resume().then(() => {
              console.log("[SyncPage] AudioContext resumed successfully via button.");
            }).catch(e => console.error("[SyncPage] Failed to resume AudioContext via button:", e));
          } else {
            console.log("[SyncPage] AudioContext is already running, not created, or closed.");
          }
        }}
        // Disable button if context is already running or not created/closed
        disabled={!audioCtxRef.current || audioCtxRef.current.state === 'running' || audioCtxRef.current.state === 'closed'}
      >
        Resume Audio
      </Button>

      <Card className="w-full max-w-md bg-gray-800 text-white">
        <CardHeader>
          <CardTitle className="text-xl">Synchronization Status</CardTitle> {/* Changed title */}
        </CardHeader>
        <CardContent className="space-y-4">
          { /* {currentNote && (
            <div className="text-sm text-cyan-400">
              Now playing: <strong>{currentNote}</strong> note
            </div>
          )}  */}
          <div className="flex items-center space-x-2">
            {/* Show loader during coarse sync */}
            {(syncing || (!syncComplete)) ? (
              <Loader2 className="animate-spin h-5 w-5 text-gray-400" />
            ) : syncComplete ? (
              <Check className="w-5 h-5 text-green-500"/>
            ) : (
              // Placeholder for space when no loader/checkmark
              <span className="h-5 w-5" /> // Use h-6 w-6 if checkmark is larger
            )}
            <span className="text-sm text-gray-300">
              {!connected ? (
                "Connecting to server…"
              ) : syncing ? (
                "Synchronizing clocks (coarse sync)…"
              ) : syncComplete ? (
                "Synchronization complete!"
              ) : (
                "Initializing..." // Default state if none above match
              )}
            </span>
          </div>

          {/* Display coarse sync details if available */}
          {minRtt !== null && (
            <div className="text-sm text-gray-200 space-y-1">
              <div>Coarse Sync Tolerance: {tolerance.toFixed(1)} ms</div>
              {/* Display current offset */}
              <div>Current Offset (Server - Client): {offset.toFixed(1)} ms</div>
              <div>
                Estimated Server Time: {new Date(serverTime).toLocaleTimeString()}
              </div>
              {minRtt !== null && rttsRef.current.length > 0 && (
                <div className="text-sm text-gray-400 mt-2">
                  All RTT samples:
                  <ul className="list-disc list-inside text-xs text-gray-500 mt-1">
                    {rttsRef.current.map((rtt, idx) => (
                      <li key={idx}>{rtt.toFixed(1)} ms</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Display mic status */}
          {/* {!micReady && (
            !connected ? ( // If not connected, mic status might not be relevant yet or request blocked
              null // Or a message like "Waiting for connection to request mic..."
            ) : (
              <div className="text-sm text-yellow-400">
                Requesting microphone access…
              </div>
            )
          )} */}

          {/* Display sync  status */}
          {/* {recordMsg && !syncComplete && (
            <div className="text-sm text-blue-400 space-y-1">
              <div>Received beacon signal.</div>
              <div>Beacon ID: {recordMsg.beacon_id}</div>
              <div>Processing recording for fine sync…</div>
            </div>
          )} */}
          {syncComplete && (
            <div className="text-sm text-green-400">
              Synchronization complete. You are ready! {/* Or show a "Join Room" button */}
            </div>
          )}

          {/* Display connection status */}
          {!connected && (
            <div className="text-sm text-red-400">
              Connection lost or failed. Redirecting to login…
            </div>
          )}

          {/* Display AudioContext status */}
          {audioCtxRef.current && audioCtxRef.current.state !== 'running' && connected && (
            <div className="text-sm text-yellow-400">
              Audio playback may not work until you resume audio (requires user click).
            </div>
          )}

        </CardContent>
        {/* Optional: Add a button to proceed after sync is complete */}
        {syncComplete && (
          <div className="p-4 pt-0">
            <Button className="w-full" onClick={() => {
              // TODO: Navigate to the next page or signal readiness to the server
              console.log("[SyncPage] Synchronization complete. Ready to proceed!");
              // Example: navigate("/room"); // Assuming you navigate to a room page
              // OR send a message to the server like { type: "client_ready" }
              // Ensure you have sent the fine_sync_result before navigating if needed by server
            }}>
              Proceed
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}