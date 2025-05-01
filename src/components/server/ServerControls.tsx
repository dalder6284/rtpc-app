import { toast } from "sonner"
import { invoke } from "@tauri-apps/api/core"
import { Power, Settings } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useState } from "react"


type ServerControlsProps = {
  wsPort: number
  setWsPort: (p: number) => void
  webPort: number
  setWebPort: (p: number) => void
  serverOn: boolean
  setServerOn: (val: boolean) => void
}

export default function ServerControls({ wsPort, setWsPort, webPort, setWebPort, serverOn, setServerOn }: ServerControlsProps) {
  const [sessionTtlMinutes, setSessionTtlMinutes] = useState(60) // default 60 minutes
  const [connecting, setConnecting] = useState(false)


  const handleToggle = async () => {
    if (serverOn) {
      await invoke("stop_server")
      toast("Server stopped.")
      setServerOn(false)
    } else {
      setConnecting(true)

      try {
        await invoke("start_server", {
          host: "127.0.0.1",
          wsPort,
          webPort,
          ttlMs: sessionTtlMinutes * 60_000,
        })

        setServerOn(true)
        toast("Server started.")
      } catch (err) {
        toast.error("Failed to start server.")
        console.error(err)
      } finally {
        setConnecting(false)
      }
    }
  }



  return (
    <>
      <Button
        size="icon"
        className={cn(
          "w-10 h-10 flex items-center justify-center",
          serverOn ? "bg-green-500 hover:bg-green-700" : "bg-zinc-700",
          "rounded-full"
        )} onClick={handleToggle}
      >
        <Power className="w-4 h-4" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <button
            className="absolute top-12 p-2 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white transition-colors disabled:opacity-50"
            title="Settings"
            disabled={connecting || serverOn}
          >
            <Settings className="h-5 w-5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 text-xs" align="end">
          <div className="space-y-2">
            <div className="text-sm font-medium">Server Settings</div>
            <div className="space-y-1">
              <label htmlFor="host" className="block text-xs text-zinc-400">Host</label>
              <Input id="host" value="localhost" disabled />
            </div>
            <div className="space-y-1">
              <label htmlFor="Socket Port" className="block text-xs text-zinc-400">Socket Port</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Input
                        type="number"
                        value={wsPort}
                        onChange={(e) => setWsPort(Number(e.target.value))}
                        disabled={serverOn || connecting}
                        className="w-full"
                        min={1}
                        max={65535}
                      />
                    </div>
                  </TooltipTrigger>
                  {serverOn && (
                    <TooltipContent side="top" className="text-xs">
                      Stop the server to change the port
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <label htmlFor="Web Port" className="block text-xs text-zinc-400">Site Port</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Input
                        type="number"
                        value={webPort}
                        onChange={(e) => setWebPort(Number(e.target.value))}
                        disabled={serverOn || connecting}
                        className="w-full"
                        min={1}
                        max={65535}
                      />
                    </div>
                  </TooltipTrigger>
                  {serverOn && (
                    <TooltipContent side="top" className="text-xs">
                      Stop the server to change the port
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <label htmlFor="TTL" className="block text-xs text-zinc-400">Session TTL (minutes)</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Input
                        type="number"
                        value={sessionTtlMinutes}
                        onChange={(e) => setSessionTtlMinutes(Number(e.target.value))}
                        disabled={serverOn || connecting}
                        className="w-full"
                        min={1}
                      />
                    </div>
                  </TooltipTrigger>
                  {(serverOn || connecting) && (
                    <TooltipContent side="top" className="text-xs">
                      Stop the server to change TTL
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  )
}
