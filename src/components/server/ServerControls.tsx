import { Power, Settings } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useServerToggle } from "@/lib/hooks/useServerToggle"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useState } from "react"

// Updated type to use a single port
type ServerControlsProps = {
  port: number; // Single port prop
  setPort: (p: number) => void; // Single setter for the port
  serverOn: boolean;
  setServerOn: (val: boolean) => void;
}

export default function ServerControls({ port, setPort, serverOn, setServerOn }: ServerControlsProps) {
  const [sessionTtlMinutes, setSessionTtlMinutes] = useState(60) // default 60 minutes
  const [connecting, setConnecting] = useState(false)
  const { toggleServer } = useServerToggle()

  const handleToggle = async () => {
    toggleServer({ port, ttlMinutes: sessionTtlMinutes, setServerOn, setConnecting }, serverOn)
  }

  return (
    <>
      <Button
        size="icon"
        className={cn(
          "w-10 h-10 flex items-center justify-center",
          serverOn ? "bg-green-500 hover:bg-green-700" : "bg-zinc-700",
          "rounded-full",
          connecting && "opacity-50 cursor-not-allowed" // Add connecting state styling
        )}
        onClick={handleToggle}
        disabled={connecting} // Disable button while connecting
      >
        {/* You could add a spinner here when connecting */}
        <Power className={cn("w-4 h-4", connecting && "animate-pulse")} />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <button
            className="absolute top-12 p-2 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white transition-colors disabled:opacity-50"
            title="Settings"
            disabled={connecting || serverOn} // Disable settings while connecting or server is on
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
            {/* Single input for the shared server port */}
            <div className="space-y-1">
              {/* Updated label */}
              <label htmlFor="server-port" className="block text-xs text-zinc-400">Server Port</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Input
                        id="server-port" // Add ID for label association
                        type="number"
                        value={port} // Use the single port state
                        onChange={(e) => setPort(Number(e.target.value))} // Use the single setter
                        disabled={serverOn || connecting}
                        className="w-full"
                        min={1}
                        max={65535}
                      />
                    </div>
                  </TooltipTrigger>
                  {/* Updated tooltip content */}
                  {(serverOn || connecting) && (
                    <TooltipContent side="top" className="text-xs">
                      Stop the server to change the port
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
            {/* Removed the redundant "Site Port" input */}

            {/* Session TTL input - remains the same */}
            <div className="space-y-1">
              <label htmlFor="TTL" className="block text-xs text-zinc-400">Session TTL (minutes)</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Input
                        id="TTL" // Add ID for label association
                        type="number"
                        value={sessionTtlMinutes}
                        onChange={(e) => setSessionTtlMinutes(Number(e.target.value))}
                        disabled={serverOn || connecting}
                        className="w-full"
                        min={1} // Added min value
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