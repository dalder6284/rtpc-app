import { useWebSocket } from "@/context/useWebSocket"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import type { ServerToClientMessage } from "../types/MessageTypes"


export default function LoginPage() {
  const [seatNumber, setSeatNumber] = useState("")
  const [maxSeats, setMaxSeats] = useState(64)
  const [loading, setLoading] = useState(false)

  const { send, onMessage, connected } = useWebSocket()

  const navigate = useNavigate()

  // Still load maxSeats from config.json
  useEffect(() => {
    const loadConfig = async () => {
      const res = await fetch(`/config.json?ts=${Date.now()}`)
      const config = await res.json()
      setMaxSeats(config.maxSeats)
    }

    loadConfig()
  }, [])

  // Attempt to rejoin if session exists in localStorage
  useEffect(() => {
    if (!connected) return

    const id = localStorage.getItem("client_id")
    const seat = localStorage.getItem("client_seat")
    const expiresAt = localStorage.getItem("client_expires_at")

    if (id && seat && expiresAt) {
      const expiration = parseInt(expiresAt)
      if (Date.now() < expiration) {
        console.log("Attempting rejoin with ID:", id)
        send({ type: "rj", id })
        setSeatNumber(seat)
        setLoading(true)
      } else {
        console.log("Stored session expired.")
        localStorage.removeItem("client_id")
        localStorage.removeItem("client_seat")
        localStorage.removeItem("client_expires_at")
      }
    }
  }, [connected, send])


  useEffect(() => {
    if (!connected) return

    const unsubscribe = onMessage<ServerToClientMessage>((msg) => {
      if (msg instanceof ArrayBuffer) return; // ignore binary data here

      console.log("Received message:", msg)

      if (msg.type === "joined") {
        localStorage.setItem("client_id", msg.id)
        localStorage.setItem("client_expires_at", msg.expiresAt.toString())
        localStorage.setItem("client_seat", msg.seat)

        sessionStorage.setItem("just_joined", "true")

        navigate("/sync")
      } else if (msg.type === "error") {
        if (msg.message === "Seat is already taken") {
          toast.warning("Seat already taken...")
        } else if (msg.message === "Client ID is no longer valid") {
          console.warn("Invalid stored session. Clearing localStorage.")
          localStorage.removeItem("client_id")
          localStorage.removeItem("client_expires_at")
          localStorage.removeItem("client_seat")
        } else {
          console.warn("Unhandled error message:", msg.message)
        }
      } else {
        console.warn("Unknown message:", msg)
      }

      setLoading(false)
    })

    return unsubscribe
  }, [onMessage, connected, navigate])


  const isValid = () => {
    const num = Number(seatNumber)
    return num >= 1 && num <= maxSeats
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid()) return
    setLoading(true)

    console.log("Joining seat", seatNumber)

    send({ type: "j", seat: Number(seatNumber) })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#023430]">
      <form
        onSubmit={handleSubmit}
        className="w-[90%] max-w-md space-y-6 rounded-2xl bg-black/70 p-8 shadow-xl backdrop-blur"
      >
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <img src="/logo.png" alt="RTPC Logo" className="h-12" />
            <h1 className="text-2xl font-semibold tracking-tight text-white">RTPC</h1>
          </div>
          <p className="text-muted-foreground">
            Real-Time Performance Control, Redefined.
          </p>
        </div>

        <div className="space-y-4">
          <Label htmlFor="seat" className="text-white">
            Seat Number
          </Label>
          <Input
            id="seat"
            type="number"
            min={1}
            max={maxSeats}
            value={seatNumber}
            onChange={(e) => setSeatNumber(e.target.value)}
            placeholder={`e.g. 8 (1-${maxSeats})`}
            className="bg-black/40 text-white placeholder:text-gray-400"
          />
        </div>

        <div className="flex justify-center pt-2">
          <Button
            type="submit"
            className="w-full"
            disabled={!isValid() || loading || !connected}
          >
            {loading ? "Connecting..." : "Connect"}
          </Button>
        </div>
      </form>
    </div>
  )
}
