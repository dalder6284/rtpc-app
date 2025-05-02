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

export default function PlayPage() {
  const { connected, send, onMessage } = useWebSocket()
  const audioCtxRef = useRef<AudioContext | null>(null)
  const [audioReady, setAudioReady] = useState(false)
  const chunksByName = useRef<Record<string, ArrayBuffer[]>>({})
  const [missingPatchFiles, setMissingPatchFiles] = useState<string[]>([])
  const [missingSheetFiles, setMissingSheetFiles] = useState<string[]>([])
  const requestedType = useRef<Record<string, "patch" | "sheet">>({})
  const navigate = useNavigate()

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
        console.log("[NextPage] AudioContext running")
        setAudioReady(true)
      })
      .catch((err) => {
        console.warn("[NextPage] AudioContext resume failed:", err)
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
      const patchMisses: string[] = []
      for (const { name, hash } of msg.patch_files) {
        const data = await loadPatch(name)
        if (!data) {
          // never had it
          patchMisses.push(name)
        } else {
          const localHash = await computeHash(data)
          if (localHash !== hash) {
            // hash mismatch, need to redownload
            patchMisses.push(name)
          }
        }

        const sheetMisses: string[] = []
        for (const { name, hash } of msg.sheet_files) {
          const data = await loadSheet(name)
          if (!data) {
            // never had it
            sheetMisses.push(name)
          } else {
            const localHash = await computeHash(data)
            if (localHash !== hash) {
              // hash mismatch, need to redownload
              sheetMisses.push(name)
            }
          }
        }

        setMissingPatchFiles(patchMisses)
        setMissingSheetFiles(sheetMisses)

        patchMisses.forEach((name) => {
          requestedType.current[name] = "patch";
          send({ type: "file_request", name, fileType: "patch" });
        });
        sheetMisses.forEach((name) => {
          requestedType.current[name] = "sheet";
          send({ type: "file_request", name, fileType: "sheet" });
        });
      }
    }

    const unsub = onMessage<ServerToClientMessage | ArrayBuffer>(async (msg) => {
      if (msg instanceof ArrayBuffer) {
        const view = new DataView(msg)
        const headerLen = view.getUint32(0, false)
        const headerBytes = new Uint8Array(msg.slice(4, 4 + headerLen))
        const headerText = new TextDecoder("utf-8").decode(headerBytes)
        const { id: name, isLast } = JSON.parse(headerText) as {
          id: string
          isLast: boolean
        }

        const chunk = msg.slice(4 + headerLen)

        // initialize the per-file chunk array if needed
        if (!chunksByName.current[name]) {
          chunksByName.current[name] = []
        }
        chunksByName.current[name].push(chunk)

        if (isLast) {
          // concatenate all the chunks into one ArrayBuffer
          const all = concatenate(chunksByName.current[name])
          const type = requestedType.current[name]

          // update the correct “missing” state
          if (type === "patch") {
            await savePatch(name, all)
            setMissingPatchFiles((prev) => prev.filter((f) => f !== name))
          } else {
            await saveSheet(name, all)
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
