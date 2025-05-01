import {
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react"
import { WebSocketContext } from "./useWebSocket"
import type { WebSocketContextType } from "./WebSocketTypes"
// import { toast } from "sonner"

type WebSocketProviderProps = {
  wsPort: number
  children: ReactNode
}

export function WebSocketProvider({ wsPort, children }: WebSocketProviderProps) {
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const host = window.location.hostname
    const socket = new WebSocket(`wss://${host}:${wsPort}/ws`)
    socketRef.current = socket

    console.log(`Connecting to WebSocket at ws://${host}:${wsPort}/ws`)

    socket.onopen = () => setConnected(true)
    socket.onclose = () => {
      setConnected(false)
      // toast.error("WebSocket connection closed")
    }
    socket.onerror = () => {
      setConnected(false)
      // toast.error("WebSocket encountered an error")
    }

    return () => socket.close()
  }, [wsPort])

  const send = useCallback((msg: Record<string, unknown>) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg))
    }
  }, [])

  function _onMessage<T = unknown>(cb: (msg: T) => void) {
    if (socketRef.current) {
      socketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data) as T
        cb(data)
      }
    }
  }

  const onMessage = useCallback(_onMessage, [])

  const value: WebSocketContextType = {
    connected,
    send,
    onMessage,
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}
