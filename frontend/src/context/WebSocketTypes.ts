export type WebSocketContextType = {
    connected: boolean
    send: (msg: Record<string, unknown>) => void
    onMessage: <T = unknown>(cb: (msg: T | ArrayBuffer) => void) => void;
  }
  