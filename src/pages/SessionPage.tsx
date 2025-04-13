import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle
} from "@/components/ui/resizable"

import PhaseConfigurationPanel from "@/components/sessionPage/PhaseConfigurationPanel"
import AudienceCanvasPanel from "@/components/sessionPage/AudienceCanvas/AudienceCanvasPanel"

import PalettePanel from "@/components/sessionPage/Palette/PalettePanel"


export default function SessionPage() {
  return (
    <div className="h-screen w-screen bg-background text-foreground">
      <ResizablePanelGroup direction="horizontal" className="h-full border border-zinc-700 overflow-hidden">
        {/* Left Panel: Phase Configuration */}
        <ResizablePanel defaultSize={18} minSize={12} className="bg-zinc-900">
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
