import { useNavigate } from "react-router-dom"
import { useState } from "react"

import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle
} from "@/components/ui/resizable"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import PhaseConfigurationPanel from "@/components/sessionPage/PhaseConfigurationPanel"
import AudienceCanvasPanel from "@/components/sessionPage/AudienceCanvas/AudienceCanvasPanel"
import PalettePanel from "@/components/sessionPage/Palette/PalettePanel"
import { useSaveShortcut } from "@/components/sessionPage/SaveShortcut"




export default function SessionPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const navigate = useNavigate()

  const handleConfirmStartServer = async () => {
    try {
      // await invoke("start_server")
      navigate("/join")
    } catch (err) {
      console.error("Failed to start server:", err)
      alert("Failed to start the server.")
    }
  }

  useSaveShortcut()

  return (
    <div className="h-screen w-screen bg-background text-foreground relative">
      <div className="absolute top-4 right-4 z-50">
        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="default" className="text-white bg-lime-600 hover:bg-lime-600 opacity-80 hover:opacity-100 h-7 px-3 text-xs">Start Server</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start Server?</AlertDialogTitle>
              <AlertDialogDescription>
                This will launch the sync server and redirect to the sync view.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmStartServer}>
                Start
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <ResizablePanelGroup direction="horizontal" className="h-full border border-zinc-700 overflow-hidden">
        {/* Left Panel: Phase Configuration */}
        <ResizablePanel defaultSize={24} minSize={12} className="bg-zinc-900">
          <div className="h-full w-full p-4 flex flex-col">
            <PhaseConfigurationPanel />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-zinc-800 hover:bg-zinc-700 transition-colors" />

        {/* Right Panel Group: Audience + Sheet/Patch */}
        <ResizablePanel defaultSize={70} minSize={30} className="bg-zinc-900">
          <ResizablePanelGroup direction="vertical" className="h-full">
            {/* Top Right: Audience Canvas */}
            <ResizablePanel defaultSize={65} minSize={20} className="bg-zinc-900">
              <div className="h-full w-full p-4 flex flex-col">
                <h2 className="text-sm font-medium text-zinc-300 mb-1">Audience Canvas</h2>
                <AudienceCanvasPanel />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="bg-zinc-800 hover:bg-zinc-700 transition-colors" />

            {/* Bottom Right: Sheet Music / RNBO */}
            <ResizablePanel defaultSize={35} minSize={15} className="bg-zinc-900">
              <div className="h-full w-full p-4 flex flex-col">
                <h2 className="text-sm font-medium text-zinc-300 mb-1">Sheet Music / RNBO Patches</h2>
                <PalettePanel />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
