import { useState } from "react"
// import { invoke } from "@tauri-apps/api/core"
import ServerControls from "@/components/server/ServerControls"
import ConnectionQR from "@/components/server/ConnectionQR"
import { useNavigate } from "react-router-dom"
import { useServerToggle } from "@/lib/hooks/useServerToggle"
import { Button } from "@/components/ui/button"

export default function JoinPage() {
  // Use a single state variable for the port
  const [port, setPort] = useState(3030) // Choose a default port
  const [serverOn, setServerOn] = useState(false)
  const navigate = useNavigate()
  const { toggleServer } = useServerToggle()

  // const playMLSAtTime = async (playTime: number, beaconUrl: string) => {
  //   try {
  //     const context = new AudioContext()
  //     const delay = playTime - Date.now() / 1000

  //     if (delay < 0) {
  //       console.warn("playTime already passed!")
  //       return
  //     }

  //     const response = await fetch(beaconUrl)
  //     const arrayBuffer = await response.arrayBuffer()
  //     const audioBuffer = await context.decodeAudioData(arrayBuffer)

  //     const source = context.createBufferSource()
  //     source.buffer = audioBuffer
  //     source.connect(context.destination)

  //     source.start(context.currentTime + delay)
  //     console.log(`[Beacon] Scheduled playback in ${delay.toFixed(3)}s`)
  //   } catch (err) {
  //     console.error("Error playing MLS:", err)
  //   }
  // }

  // const handleBroadcast = () => {
  //   // Schedule broadcast 3 seconds from now
  //   const playTime = (Date.now() + 3000) / 1000

  //   invoke("broadcast_json", {
  //     message: {
  //       type: "start_record",
  //       play_time: playTime,
  //       duration: 2.0,
  //       epsilon: 0.05,
  //       beacon_id: "mls_4095"
  //     },
  //   }).then(() => {
  //     console.log("Broadcast sent!")
  //     // Note: /bandlimited_mls_15khz.wav is a relative path,
  //     // it will fetch from the same origin the page was served from (https://ip:port)
  //     playMLSAtTime(playTime, "/bandlimited_mls_15khz.wav")
  //   }).catch((err) => {
  //     console.error("Failed to broadcast:", err)
  //   })
  // }

  const handleBack = async () => {
    if (serverOn) {
      await toggleServer({ port, ttlMinutes: 60, setServerOn }, true) // Just to turn it off
    }
    navigate("/session")
  }


  return (
    <div className="relative w-screen h-screen bg-background text-foreground">
      {/* Top-left: Back button */}
      <div className="absolute top-4 left-4 z-10">
        <Button onClick={handleBack} className="bg-zinc-700 hover:bg-zinc-600">
          Back
        </Button>
      </div>

      {/* Top right: server controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <ServerControls
          // Pass the single port state and setter
          port={port}
          setPort={setPort}
          serverOn={serverOn}
          setServerOn={setServerOn}
        />
      </div>

      {/* Center: QR code + button */}
      <div className="flex flex-col items-center justify-center h-full gap-4">
        {/* Pass the single port to ConnectionQR */}
        <ConnectionQR port={port} serverOn={serverOn} />
        {/* <button
          onClick={handleBroadcast}
          className="px-4 py-2 bg-primary text-white rounded-lg shadow hover:bg-primary/80 transition"
        >
          Broadcast Test JSON
        </button> */}
      </div>
    </div>
  )
}