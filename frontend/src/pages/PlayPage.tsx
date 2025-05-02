// src/pages/PlayPage.tsx
import { useEffect, useRef, useState } from "react"
import { useWebSocket } from "@/context/useWebSocket"
import { savePatch, saveSheet, loadPatch, loadSheet } from "@/lib/indexedDB";
import { ReadyMessage, ServerToClientMessage, FileManifestMessage } from "@/types/MessageTypes"
import { computeHash, concatenate } from "@/lib/utils"
import { useNavigate } from "react-router-dom"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Check } from "lucide-react"
import { MissingFilesList } from "@/components/MissingFilesList"
import { setupDevice, sendMIDI, notationToBeats } from "@/lib/music";
import { SheetFile } from "@/types/SheetRNBOTypes"
import { IPatcher } from "@rnbo/js"



export default function PlayPage() {
  const { connected, send, onMessage } = useWebSocket()
  const audioCtxRef = useRef<AudioContext | null>(null)
  const [audioReady, setAudioReady] = useState(false)
  const chunksByName = useRef<Record<string, ArrayBuffer[]>>({})
  const [missingPatchFiles, setMissingPatchFiles] = useState<string[]>([])
  const [missingSheetFiles, setMissingSheetFiles] = useState<string[]>([])
  const [readySent, setReadySent] = useState(false)
  const requestedType = useRef<Record<string, "patch" | "sheet">>({})
  const navigate = useNavigate()

  const [bpm, setBpm] = useState<number>(60);
  const beatZeroRef = useRef<number>(0);
  const timeOffsetRef = useRef<number>(0);
  const schedulerID = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastScheduledBeat = useRef<number>(0);

  function rollingScheduler(sheet: SheetFile, bpm: number, beatZero: number, offset: number) {
    const beatDurationMs = (60 * 1000) / bpm;
    const now = Date.now() + offset;
    const currentBeat = (now - beatZero) / beatDurationMs;
    const upperBeat = currentBeat + 2;

    for (const track of sheet.tracks) {
      for (const note of track.notes) {
        if (note.start >= lastScheduledBeat.current && note.start < upperBeat) {
          const durationInBeats = notationToBeats(note.duration);
          sendMIDI(
            note.pitch,
            note.velocity,
            durationInBeats,
            note.start,
            bpm,
            now,
            beatZero,
            audioCtxRef.current!,
            track.channel
          );
        }
      }
    }

    if (lastScheduledBeat.current >= sheet.end_beat) {
      if (schedulerID.current) clearInterval(schedulerID.current);
      schedulerID.current = null;
      lastScheduledBeat.current = 0;
      console.log("[PlayPage] Scheduler finished.");
    }

    lastScheduledBeat.current = upperBeat;
  }  


  const storedOffset = localStorage.getItem("offset");
  if (storedOffset) {
    const parsedOffset = parseInt(storedOffset, 10);
    if (!isNaN(parsedOffset)) {
      timeOffsetRef.current = parsedOffset;
    } else {
      console.warn("Invalid offset value in localStorage:", storedOffset);
    }
  }

  useEffect(() => {
    if (connected) return
    const t = setTimeout(() => {
      console.warn("WebSocket not connected after 5s, redirecting to login.");
      navigate("/");
    }, 5000);
    return () => clearTimeout(t);
  }, [connected, navigate]);

  // Create & resume the AudioContext on mount
  useEffect(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    audioCtxRef.current = ctx

    ctx.resume()
      .then(() => {
        console.log("[PlayPage] AudioContext running")
        setAudioReady(true)
      })
      .catch((err) => {
        console.warn("[PlayPage] AudioContext resume failed:", err)
        setAudioReady(false)
      })

    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => { })
      }
    }
  }, [])

  // Send a message to the server with ID to specify that you are on the play stage.
  // Checks which files are stored in IndexedDB and then requests the server to send missing ones.
  useEffect(() => {
    if (!connected) return

    const id = localStorage.getItem("client_id")

    async function handleFileManifest(msg: FileManifestMessage) {
      const patchMisses: string[] = [];

      for (const { name, hash } of msg.patch_files) {
        const filename = name + ".json";
        const data = await loadPatch(filename);
        if (!data) {
          patchMisses.push(name);
        } else {
          const localHash = await computeHash(data);
          if (localHash !== hash) {
            patchMisses.push(name);
          }
        }
      }

      const sheetMisses: string[] = [];

      for (const { name, hash } of msg.sheet_files) {
        const filename = name + ".json";
        const data = await loadSheet(filename);
        if (!data) {
          sheetMisses.push(name);
        } else {
          const localHash = await computeHash(data);
          if (localHash !== hash) {
            sheetMisses.push(name);
          }
        }
      }

      setMissingPatchFiles(patchMisses);
      setMissingSheetFiles(sheetMisses);
      setReadySent(true)

      patchMisses.forEach((name) => {
        requestedType.current[name] = "patch";
        send({ type: "file_request", id: name, fileType: "patch" });
      });

      sheetMisses.forEach((name) => {
        requestedType.current[name] = "sheet";
        send({ type: "file_request", id: name, fileType: "sheet" });
      });
    }


    const unsub = onMessage<ServerToClientMessage | ArrayBuffer | Blob>(async (msg) => {
      if (msg instanceof Blob) {
        console.log("Received blob.")
        msg = await msg.arrayBuffer()
      }

      if (msg instanceof ArrayBuffer) {
        const view = new DataView(msg)
        const headerLen = view.getUint32(0, false)
        const headerBytes = new Uint8Array(msg.slice(4, 4 + headerLen))
        const headerText = new TextDecoder("utf-8").decode(headerBytes)
        console.log("Header length:", headerLen);
        console.log("Header raw:", new Uint8Array(msg.slice(4, 4 + headerLen)));
        console.log("Header text:", headerText);
        const { id: name, fileType, isLast } = JSON.parse(headerText) as {
          id: string
          isLast: boolean
          fileType: "patch" | "sheet"
        }

        const chunk = msg.slice(4 + headerLen)

        // initialize the per-file chunk array if needed
        if (!chunksByName.current[name]) {
          chunksByName.current[name] = []
        }
        chunksByName.current[name].push(chunk)

        if (isLast) {
          console.log("Received last chunk for file:", name)
          // concatenate all the chunks into one ArrayBuffer
          const all = concatenate(chunksByName.current[name])
          const type = fileType || requestedType.current[name]

          const text = new TextDecoder().decode(all);
          let json;
          try {
            json = JSON.parse(text);
          } catch (e) {
            console.error("Failed to parse file as JSON:", e, text);
            return;
          }
          // update the correct “missing” state
          if (type === "patch") {
            await savePatch(name, json)
            setMissingPatchFiles((prev) => prev.filter((f) => f !== name))
          } else {
            await saveSheet(name, json)
            setMissingSheetFiles((prev) => prev.filter((f) => f !== name))
          }

          // clean up our refs
          delete requestedType.current[name]
          delete chunksByName.current[name]
        }
      } else {
        if (msg.type === "error") {
          console.error("Error from server:", msg.message)
          if (msg.message === "Client ID is no longer valid") {
            console.warn("Invalid stored session. Clearing localStorage.")
            localStorage.removeItem("client_id")
            localStorage.removeItem("client_expires_at")
            localStorage.removeItem("client_seat")
            console.log("Redirecting to login page.")
            navigate("/");
          } else {
            console.warn("Unhandled error message:", msg.message)
          }
        } else if (msg.type === "file_manifest") {
          console.log("Received file manifest:", msg)
          await handleFileManifest(msg)
        }
      }
    })

    try {
      const readyMsg: ReadyMessage = {
        type: "ready",
        id: id || "",
      }
      send(readyMsg)
    } catch (err) {
      console.error("Failed to send ready message:", err)
    }
    return unsub
  }, [connected, send, onMessage, navigate])


  // Wait to listen for phase starts from the server.
  useEffect(() => {
    if (!connected || !audioReady || !readySent || missingPatchFiles.length > 0 || missingSheetFiles.length > 0) {
      return;
    }

    function startScheduler(sheet: SheetFile) {
      if (schedulerID.current !== null) return;
      schedulerID.current = setInterval(() => {
        rollingScheduler(sheet, bpm, beatZeroRef.current, timeOffsetRef.current);
      }, 200);
    }

    function stopScheduler() {
      if (schedulerID.current) {
        clearInterval(schedulerID.current);
        schedulerID.current = null;
      }
    }

    const unsub = onMessage<ServerToClientMessage>(async (msg) => {
      if (msg instanceof Blob || msg instanceof ArrayBuffer) return;
      if (msg.type === "phase_start") {

        const { bpm: newBpm, start_time, assignments } = msg;
        const seat = localStorage.getItem("client_seat");

        if (!seat || !(seat in assignments)) {
          console.warn("No assignment for this seat.");
          return;
        }

        const { rnbo_id, sheet_id } = assignments[seat];

        const patchBlob = await loadPatch(rnbo_id);
        if (!patchBlob) {
          console.warn("Patch not found");
          return;
        }
        const patchJSON = patchBlob as unknown as IPatcher;
        
        const sheetBlob = await loadSheet(sheet_id);
        if (!sheetBlob) {
          console.warn("Sheet not found");
          return;
        }
        const sheetJSON = sheetBlob as unknown as SheetFile;
        

        if (!patchJSON || !sheetJSON) {
          console.warn("Missing patch or sheet.");
          return;
        }

        // Apply state and synchronization
        setBpm(newBpm);
        beatZeroRef.current = start_time;
        timeOffsetRef.current = start_time - Date.now();
        lastScheduledBeat.current = 0;

        // Start the RNBO device and scheduler
        await setupDevice(audioCtxRef.current!, patchJSON);
        startScheduler(sheetJSON);
      } else if (msg.type === "phase_stop") {
        stopScheduler();
      }
    });

    return unsub;
  }, [connected, onMessage, audioReady, readySent, missingPatchFiles, missingSheetFiles, bpm]);


  return (
    <div className="flex items-center justify-center min-h-screen bg-black px-4">
      {/* Resume AudioContext button (needed for user gesture on some platforms) */}
      <Button
        className="fixed top-4 right-4 bg-gray-800 hover:bg-gray-700"
        onClick={() => {
          if (audioCtxRef.current && audioCtxRef.current.state !== "running") {
            audioCtxRef.current
              .resume()
              .then(() => setAudioReady(true))
              .catch(() => { })
          }
        }}
        disabled={audioReady || !audioCtxRef.current}
      >
        Resume Audio
      </Button>

      <Card className="w-full max-w-md bg-black text-white shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl">Beginning session...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            {!audioReady ? (
              <Loader2 className="animate-spin h-5 w-5 text-gray-400" />
            ) : (
              <Check className="h-5 w-5 text-green-500" />
            )}
            <span className="text-sm">
              {!audioReady ? "Initializing audio…" : "Audio ready!"}
            </span>
          </div>
          <MissingFilesList
            missingPatchFiles={missingPatchFiles}
            missingSheetFiles={missingSheetFiles}
          />

          {!connected && (
            <div className="text-sm text-red-400">
              Connection lost or failed. Redirecting to login…
            </div>
          )}

          {/* Warning if AudioContext isn’t running */}
          {audioCtxRef.current && audioCtxRef.current.state !== "running" && (
            <div className="text-sm text-yellow-400">
              Audio playback may not work until you resume audio (requires user click).
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
