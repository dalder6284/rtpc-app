import { useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { toast } from "sonner"

export function useSaveShortcut() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.includes("Mac")
      const isSave =
        (isMac && e.metaKey && e.key === "s") || (!isMac && e.ctrlKey && e.key === "s")

      if (isSave) {
        e.preventDefault()
        invoke("save_session_to_file")
          .then(() => {
            toast.success("Session saved to disk.")
          })
          .catch(() => {
            toast.error("Failed to save session.")
          })
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])
}
