import { useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import ServerControls from "@/components/server/ServerControls"
import ConnectionQR from "@/components/server/ConnectionQR"

export default function JoinPage() {
  const [wsPort, setWsPort] = useState(3030)
  const [webPort, setWebPort] = useState(3031)
  const [serverOn, setServerOn] = useState(false)

  const playMLSAtTime = async (playTime: number, beaconUrl: string) => {
    try {
      const context = new AudioContext()
      const delay = playTime - Date.now() / 1000

      if (delay < 0) {
        console.warn("playTime already passed!")
        return
      }

      const response = await fetch(beaconUrl)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await context.decodeAudioData(arrayBuffer)

      const source = context.createBufferSource()
      source.buffer = audioBuffer
      source.connect(context.destination)

      source.start(context.currentTime + delay)
      console.log(`[Beacon] Scheduled playback in ${delay.toFixed(3)}s`)
    } catch (err) {
      console.error("Error playing MLS:", err)
    }
  }

  const handleBroadcast = () => {
    const playTime = (Date.now() + 3000) / 1000

    invoke("broadcast_json", {
      message: {
        type: "start_record",
        play_time: playTime,
        duration: 2.0,
        epsilon: 0.05,
        beacon_id: "mls_4095"
      },
    }).then(() => {
      console.log("Broadcast sent!")
      playMLSAtTime(playTime, "/bandlimited_mls_15khz.wav")
    }).catch((err) => {
      console.error("Failed to broadcast:", err)
    })
  }

  return (
    <div className="relative w-screen h-screen bg-background text-foreground">
      {/* Top right: server controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <ServerControls
          wsPort={wsPort}
          webPort={webPort}
          setWsPort={setWsPort}
          setWebPort={setWebPort}
          serverOn={serverOn}
          setServerOn={setServerOn}
        />
      </div>

      {/* Center: QR code + button */}
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <ConnectionQR port={webPort} serverOn={serverOn} />
        <button
          onClick={handleBroadcast}
          className="px-4 py-2 bg-primary text-white rounded-lg shadow hover:bg-primary/80 transition"
        >
          Broadcast Test JSON
        </button>
      </div>
    </div>
  )
}
