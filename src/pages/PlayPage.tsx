import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";

type Phase = {
    id: string
    name: string
    bpm: number
    countIn: number
    index: number
}

export default function PlayPage() {
  const [phases, setPhases] = useState<Phase[]>([]);

  // Load session phases from backend
  useEffect(() => {
    const fetchPhases = async () => {
        try {
          const state = await invoke<{
            phases: Record<string, any>;
            current_phase_id: string | null;
          }>("get_app_state");
  
          // Convert to array and sort
          const phaseArray: Phase[] = Object.entries(state.phases || {}).map(
            ([id, phase]): Phase => ({
              id,
              name: phase.name,
              bpm: phase.bpm,
              countIn: phase.count_in,
              index: phase.index,
            })
          );
          phaseArray.sort((a, b) => a.index - b.index);
  
          setPhases(phaseArray);
        //   setOpenPhase(state.current_phase_id ?? undefined);
        } catch (err) {
          console.error("Failed to load phases:", err);
        }
      };
    fetchPhases();
  }, []);

  const handlePlayPhase = async (phaseId: string) => {
    try {
      await invoke("broadcast_phase_start", { phaseId: phaseId });
    } catch (err) {
      console.error("Failed to play phase:", err);
    }
  };

  return (
    <div className="h-screen w-screen bg-background text-foreground relative">
      <ResizablePanelGroup direction="horizontal" className="h-full border border-zinc-700 overflow-hidden">
        <ResizablePanel defaultSize={30} minSize={20} className="bg-zinc-900">
          <div className="h-full w-full p-4 flex flex-col gap-2 overflow-y-auto">
            <h2 className="text-base font-semibold text-zinc-300 mb-2">Available Phases</h2>
            {phases.map((phase) => (
              <div
                key={phase.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors \${
                  openPhase === phase.id ? 'bg-lime-700' : 'bg-zinc-800'
                }`}
              >
                <span className="text-sm text-white">{phase.name}</span>
                <Button
                  size="sm"
                  variant="default"
                  className="bg-lime-600 hover:bg-lime-500 text-white h-7 px-3 text-xs"
                  onClick={() => handlePlayPhase(phase.id)}
                >
                  Play
                </Button>
              </div>
            ))}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
