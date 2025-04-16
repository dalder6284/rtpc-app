import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import CLOUDS from "vanta/src/vanta.fog"
import * as THREE from "three"
import { useNavigate } from "react-router-dom"

import { StartNewSessionDialog } from "@/components/mainPage/StartNewSessionDialog"
import { invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"




export default function MainPage() {
  const vantaRef = useRef<HTMLDivElement>(null)
  const [vantaEffect, setVantaEffect] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const navigate = useNavigate()

  const handleStartNewSession = async (data: {
    name: string
    path: string
    rows: number
    columns: number
  }) => {
    console.log("Submitting session config to Rust:", data)
  
    try {
      await invoke("set_session_config", {
        config: data
      })
      navigate("/session")
      
      // Navigate after success
    } catch (err) {
      console.error("Failed to set session config:", err)
      // Optionally show an error message to the user
    }
  }

  const handleLoadConfig = async () => {
    try {
      const path = await open({
        multiple: false,
        filters: [{ name: "JSON", extensions: ["json"] }]
      })
  
      if (typeof path !== "string") return // user canceled
  
      await invoke("load_session_from_file", { path })
      navigate("/session")
    } catch (err) {
      console.error("Failed to load session:", err)
    }
  }
  

  useEffect(() => {
    if (!vantaEffect && vantaRef.current) {
      const effect = CLOUDS({
        el: vantaRef.current,
        THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.00,
        minWidth: 200.00,
        highlightColor: 0x94d2bd,
        midtoneColor: 0x0a9396,
        lowlightColor: 0x005f73,
        baseColor: 0x001219,
        blurFactor: 0.70,
        speed: 0.40,
        zoom: 1.50
      })
      setVantaEffect(effect)
    }

    return () => {
      if (vantaEffect) vantaEffect.destroy()
    }
  }, [vantaEffect])

  return (
    <div ref={vantaRef} className="min-h-screen text-white flex items-center justify-center px-4">
      <Card className="w-80 text-white shadow-xl border-none rounded-xl px-6 py-8 flex flex-col justify-between relative z-10">
        <CardHeader className="flex flex-col items-center space-y-2">
          {/* Row: Logo + Title */}
          <div className="flex items-center space-x-1.5">
            <img
              src="/logo.png"
              alt="RTPC Logo"
              className="w-10 h-10 object-contain"
            />
            <CardTitle className="text-2xl font-bold leading-tight">RTPC</CardTitle>
          </div>

          {/* Slogan under logo + title */}
          <CardDescription className="text-zinc-400 italic text-sm text-center">
            Real-Time Performance Control, Redefined.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 mt-6 mb-8">
          <StartNewSessionDialog
            onSubmit={handleStartNewSession}
            isOpen={dialogOpen}
            setOpen={setDialogOpen}
          />
          <Button variant="secondary" className="w-full shadow-none" onClick={() => setDialogOpen(true)}>
            Start New Session
          </Button>
          <Button variant="secondary" className="w-full shadow-none" onClick={handleLoadConfig}>
            Load Config File
          </Button>
        </CardContent>

        <div className="text-center text-xs text-zinc-500 absolute bottom-4 left-0 right-0">
          v0.1.0
        </div>
      </Card>
    </div>
  )
}
