import { createContext, useContext } from "react"
import type { WebSocketContextType } from "./WebSocketTypes"

export const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function useWebSocket(): WebSocketContextType {
  const ctx = useContext(WebSocketContext)
  if (!ctx) {
    throw new Error("useWebSocket must be used inside a WebSocketProvider")
  }
  return ctx
}
