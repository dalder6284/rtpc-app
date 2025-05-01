import { useEffect, useState } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { WebSocketProvider } from "@/context/WebSocketProvider"
import { Toaster } from "@/components/ui/sonner"

import LoginPage from "@/pages/LoginPage"
import SyncPage from "@/pages/SyncPage"

export default function App() {
  const [wsPort, setWsPort] = useState<number | null>(null)

  useEffect(() => {
    fetch("/config.json")
      .then((res) => res.json())
      .then((cfg) => setWsPort(cfg.wsPort))
      .catch(() => console.error("Failed to load config.json"))
  }, [])

  if (!wsPort) return <div className="text-white text-center pt-10">Loading config...</div>

  return (
    <WebSocketProvider wsPort={wsPort}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/sync" element={<SyncPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </WebSocketProvider>
  )
}
