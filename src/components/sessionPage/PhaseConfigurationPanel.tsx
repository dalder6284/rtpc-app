import { useState, useEffect } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { invoke } from "@tauri-apps/api/core"

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

type Phase = {
    id: string
    name: string
    bpm: number
    countIn: number
    index: number
}

export default function PhaseConfigurationPanel() {
    const [phases, setPhases] = useState<Phase[]>([])
    const [openPhase, setOpenPhase] = useState<string | undefined>()
    const [phaseToDelete, setPhaseToDelete] = useState<Phase | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)

    const [bpmInputs, setBpmInputs] = useState<Record<string, string>>({});
    const [countInInputs, setCountInInputs] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchPhases = async () => {
            try {
                const state = await invoke<{
                    phases: Record<string, Phase>,
                    current_phase_id: string | null
                }>("get_app_state")

                // Convert HashMap → array
                const phaseArray: Phase[] = Object.entries(state.phases).map(
                    ([id, phase]: [string, any]) => ({
                        id,
                        name: phase.name,
                        bpm: phase.bpm,
                        countIn: phase.count_in,
                        index: phase.index,
                    })
                )

                phaseArray.sort((a, b) => a.index - b.index)

                setPhases(phaseArray)
                setOpenPhase(state.current_phase_id ?? undefined)
            } catch (err) {
                console.error("Failed to load phases:", err)
            }
        }

        fetchPhases()
    }, [])



    const handleAddPhase = async () => {
        const newPhase: Phase = {
            id: crypto.randomUUID(),
            name: `Phase ${phases.length + 1}`,
            bpm: 120,
            countIn: 4,
            index: phases.length,
        }

        try {
            await invoke("add_phase", { data: newPhase })
            await invoke("set_current_phase", { phaseId: newPhase.id })

            setPhases([...phases, newPhase])
            setOpenPhase(newPhase.id)
        } catch (err) {
            console.error("Failed to add phase:", err)
        }
    }


    const updatePhase = async (id: string, updates: Partial<Phase>) => {
        // Optimistically update local state
        setPhases(phases.map(p => (p.id === id ? { ...p, ...updates } : p)))

        try {
            await invoke("edit_phase", {
                phaseId: id,
                updates: updates
            })
        } catch (err) {
            console.error("Failed to sync phase update to backend:", err)
            // Optional: rollback local update or show error UI
        }
    }

    const deletePhase = async (id: string) => {
        const targetIndex = phases.find(p => p.id === id)?.index
        if (targetIndex === undefined) return

        try {
            await invoke("remove_phase", { phaseId: id })

            // Filter out the deleted phase
            const updated = phases.filter(p => p.id !== id)

            // 🟢 Re-index remaining phases
            const reindexed = updated.map(p => {
                if (p.index > targetIndex) {
                    const updatedPhase = { ...p, index: p.index - 1 }
                    invoke("edit_phase", { phaseId: p.id, updates: { index: updatedPhase.index } }) // sync to backend
                    return updatedPhase
                }
                return p
            })

            setPhases(reindexed)
            if (openPhase === id) setOpenPhase(undefined)
        } catch (err) {
            console.error("Failed to remove phase:", err)
        }
    }


    const handleOnValueChange = (val: string) => {
        setOpenPhase(val) // val is the currently open phase ID, or undefined
        console.log("Selected phase ID:", val)
        // Optionally sync to Rust
        if (val) {
            invoke("set_current_phase", { phaseId: val })
        } else {
            invoke("clear_current_phase") // optional, if you want to clear it
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-zinc-300">Phase Configuration</h3>
                <Button size="sm" variant="outline" onClick={handleAddPhase}>+ Add</Button>
            </div>
            <div className="h-[calc(100vh-100px)] overflow-y-auto pr-1">

                <Accordion type="single" collapsible value={openPhase} onValueChange={handleOnValueChange} className="space-y-2">
                    {phases.map((phase) => (
                        <AccordionItem key={phase.id} value={phase.id} className="border-none px-3 py-1">
                            <AccordionTrigger className="text-sm font-medium pr-1 py-1 min-h-0 h-auto">
                                {editingId === phase.id ? (
                                    <Input
                                        className="text-xs h-7 border-none bg-transparent p-0 focus-visible:ring-1 focus-visible:ring-ring"
                                        value={phase.name}
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                const trimmed = phase.name.trim()
                                                if (!trimmed) {
                                                    updatePhase(phase.id, { name: "(untitled phase)" })
                                                }
                                                setEditingId(null)
                                            }
                                        }}
                                        onBlur={() => {
                                            if (!phase.name.trim()) {
                                                updatePhase(phase.id, { name: "(untitled phase)" })
                                            }
                                            setEditingId(null)
                                        }}
                                        onChange={(e) => {
                                            const newName = e.target.value;
                                            updatePhase(phase.id, { name: newName });
                                        }}
                                    />
                                ) : (
                                    <div
                                        onDoubleClick={(e) => {
                                            e.stopPropagation()
                                            setEditingId(phase.id)
                                        }}
                                        className="flex items-center gap-1 text-xs text-zinc-200 w-full"
                                    >
                                        <span className="truncate text-sm font-medium">
                                            {phase.name.trim() || "(unnamed phase)"}
                                        </span>
                                    </div>
                                )}
                            </AccordionTrigger>

                            <AccordionContent className="mt-2 space-y-3 pb-4">
                                <div className="space-y-1">
                                    <Label htmlFor={`bpm-${phase.id}`} className="text-xs text-zinc-400">BPM</Label>
                                    <Input
                                        id={`bpm-${phase.id}`}
                                        type="text"
                                        inputMode="numeric"
                                        value={bpmInputs[phase.id] ?? (phase.bpm?.toString() ?? "")}
                                        onChange={(e) => {
                                            const raw = e.target.value;

                                            // Allow only digits or empty string
                                            if (/^\d*$/.test(raw)) {
                                                setBpmInputs({ ...bpmInputs, [phase.id]: raw });

                                                const parsed = parseInt(raw, 10);

                                                // Only update if parsed is at least 1
                                                if (!isNaN(parsed) && parsed >= 1) {
                                                    updatePhase(phase.id, { bpm: parsed });
                                                }
                                            }
                                        }}
                                        onBlur={() => {
                                            const raw = bpmInputs[phase.id];

                                            let parsed = parseInt(raw ?? "", 10);
                                            if (isNaN(parsed) || parsed < 1) {
                                                parsed = 1; // fallback to 1 if invalid or too small
                                            }

                                            updatePhase(phase.id, { bpm: parsed });

                                            // Clear the temp input state to re-sync with phase.bpm
                                            setBpmInputs((prev) => {
                                                const newInputs = { ...prev };
                                                delete newInputs[phase.id];
                                                return newInputs;
                                            });
                                        }}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor={`countin-${phase.id}`} className="text-xs text-zinc-400">Count-In (beats)</Label>
                                    <Input
                                        id={`countin-${phase.id}`}
                                        type="text"
                                        inputMode="numeric"
                                        value={countInInputs[phase.id] ?? (phase.countIn?.toString() ?? "")}
                                        onChange={(e) => {
                                            const raw = e.target.value;

                                            // Allow only digits or empty string
                                            if (/^\d*$/.test(raw)) {
                                                setCountInInputs({ ...countInInputs, [phase.id]: raw });

                                                const parsed = parseInt(raw, 10);

                                                // Only update if parsed is at least 1
                                                if (!isNaN(parsed) && parsed >= 1) {
                                                    updatePhase(phase.id, { countIn: parsed });
                                                }
                                            }
                                        }}
                                        onBlur={() => {
                                            const raw = countInInputs[phase.id];
                                            let parsed = parseInt(raw ?? "", 10);

                                            if (isNaN(parsed) || parsed < 1) {
                                                parsed = 1;
                                            }

                                            updatePhase(phase.id, { countIn: parsed });

                                            // Clear temp state
                                            setCountInInputs((prev) => {
                                                const newInputs = { ...prev };
                                                delete newInputs[phase.id];
                                                return newInputs;
                                            });
                                        }}
                                    />

                                </div>

                                <div className="pt-3 border-t border-zinc-800">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <button
                                                onClick={() => setPhaseToDelete(phase)}
                                                className="text-xs text-red-400 hover:text-red-500 flex items-center gap-1 mt-2"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Delete Phase
                                            </button>
                                        </AlertDialogTrigger>
                                    </AlertDialog>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>

            {phaseToDelete && (
                <AlertDialog open={!!phaseToDelete} onOpenChange={(open) => !open && setPhaseToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{phaseToDelete.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. Are you sure you want to remove this phase from the session?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setPhaseToDelete(null)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-red-500 hover:bg-red-700 text-white"
                                onClick={() => {
                                    deletePhase(phaseToDelete.id)
                                    setPhaseToDelete(null)
                                }}
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    )
}
