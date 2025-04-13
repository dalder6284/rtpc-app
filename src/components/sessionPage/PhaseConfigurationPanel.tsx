import { useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

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
}

export default function PhaseConfigurationPanel() {
    const [phases, setPhases] = useState<Phase[]>([])
    const [openPhase, setOpenPhase] = useState<string | undefined>()
    const [phaseToDelete, setPhaseToDelete] = useState<Phase | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)

    const handleAddPhase = () => {
        const newPhase: Phase = {
            id: crypto.randomUUID(),
            name: `Phase ${phases.length + 1}`,
            bpm: 120,
            countIn: 4,
        }
        setPhases([...phases, newPhase])
        setOpenPhase(newPhase.id)
    }

    const updatePhase = (id: string, updates: Partial<Phase>) => {
        setPhases(phases.map(p => (p.id === id ? { ...p, ...updates } : p)))
    }

    const deletePhase = (id: string) => {
        setPhases(phases.filter(p => p.id !== id))
        if (openPhase === id) setOpenPhase(undefined)
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-zinc-300">Phase Configuration</h3>
                <Button size="sm" variant="outline" onClick={handleAddPhase}>+ Add</Button>
            </div>

            <Accordion type="single" collapsible value={openPhase} onValueChange={setOpenPhase} className="space-y-2">
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
                                        const value = e.target.value
                                        updatePhase(phase.id, { name: value.length === 0 ? "" : value })
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
                                    type="number"
                                    value={phase.bpm}
                                    onChange={(e) => updatePhase(phase.id, { bpm: parseInt(e.target.value) || 0 })}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor={`countin-${phase.id}`} className="text-xs text-zinc-400">Count-In (beats)</Label>
                                <Input
                                    id={`countin-${phase.id}`}
                                    type="number"
                                    value={phase.countIn}
                                    onChange={(e) => updatePhase(phase.id, { countIn: parseInt(e.target.value) || 0 })}
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
