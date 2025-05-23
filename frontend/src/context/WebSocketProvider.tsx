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

  function _onMessage<T = unknown>(cb: (msg: T | ArrayBuffer) => void) {
    if (socketRef.current) {
      socketRef.current.onmessage = async (event) => {
        let raw = event.data;
  
        // Convert Blob to ArrayBuffer for unified binary handling
        if (raw instanceof Blob) {
          raw = await raw.arrayBuffer();
        }
  
        // Binary data: pass as-is
        if (raw instanceof ArrayBuffer) {
          cb(raw);
          return;
        }
  
        // String data: try to parse
        if (typeof raw === "string") {
          try {
            const parsed = JSON.parse(raw) as T;
            cb(parsed);
          } catch (e) {
            console.error("Failed to parse string as JSON:", e, raw);
          }
          return;
        }
  
        console.warn("Unrecognized message type:", raw);
      };
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
