import { useEffect, useState } from "react"
import { HashRouter as Router, Routes, Route } from "react-router-dom"
import { WebSocketProvider } from "@/context/WebSocketProvider"
import { IndexedDBProvider } from "@/context/IndexedDBProvider"
import { Toaster } from "@/components/ui/sonner"


import LoginPage from "@/pages/LoginPage"
import SyncPage from "@/pages/SyncPage"
import PlayPage from "@/pages/PlayPage"

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
      <IndexedDBProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/sync" element={<SyncPage />} />
            <Route path="/play" element={<PlayPage />} />
          </Routes>
        </Router>
        <Toaster />
      </IndexedDBProvider>
    </WebSocketProvider>
  )
}