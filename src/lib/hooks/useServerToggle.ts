import { invoke } from "@tauri-apps/api/core"
import { toast } from "sonner"

type UseServerToggleParams = {
  port: number
  ttlMinutes: number
  setServerOn: (val: boolean) => void
  setConnecting?: (val: boolean) => void
}

export const useServerToggle = () => {
  const toggleServer = async ({
    port,
    ttlMinutes,
    setServerOn,
    setConnecting,
  }: UseServerToggleParams, serverOn: boolean) => {
    if (serverOn) {
      try {
        await invoke("stop_server")
        toast("Server stopped.")
        setServerOn(false)
      } catch (err) {
        toast.error("Failed to stop server.")
        console.error(err)
      }
    } else {
      setConnecting?.(true)

      try {
        await invoke("start_server", {
          wsPort: port,
          ttlMs: ttlMinutes * 60_000,
        })
        toast("Server started.")
        setServerOn(true)
      } catch (err) {
        toast.error("Failed to start server.")
        console.error(err)
      } finally {
        setConnecting?.(false)
      }
    }
  }

  return { toggleServer }
}
