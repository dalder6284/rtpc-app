import { useEffect, useState } from "react"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { toast } from "sonner"


type SessionConfig = {
    name: string
    path: string
    rows: number
    columns: number
}

type AppStateSnapshot = {
    session: SessionConfig | null
    selected_file: { id: string; file_type: "rnbo" | "sheet" } | null
    rnbo_patches: RNBOPaletteItem[]
    sheet_music: SheetPaletteItem[]
    phases: Record<string, { assignments: SeatAssignment[] }>
    current_phase_id: string | null
}

type SeatAssignment = {
    rnbo_id?: string
    sheet_id?: string
}

type RNBOPaletteItem = {
    id: string
    label: string
    path: string
    color: string
}

type SheetPaletteItem = {
    id: string
    label: string
    path: string
    color: string
}

export default function AudienceCanvas() {
    const [config, setConfig] = useState<SessionConfig | null>(null)
    const [currentPhaseId, setCurrentPhaseId] = useState<string | null>(null)
    const [assignments, setAssignments] = useState<(SeatAssignment | null)[]>([])
    const [rnboMap, setRnboMap] = useState<Record<string, RNBOPaletteItem>>({})
    const [sheetMap, setSheetMap] = useState<Record<string, SheetPaletteItem>>({})
    const [hoveredSeatIndex, setHoveredSeatIndex] = useState<number | null>(null)



    // Fetch the session configuration when the component mounts
    useEffect(() => {
        const fetchState = async () => {
            const snapshot = await invoke<AppStateSnapshot>("get_app_state")

            if (snapshot.session) setConfig(snapshot.session)
            if (snapshot.current_phase_id) setCurrentPhaseId(snapshot.current_phase_id)

            const phase = snapshot.phases[snapshot.current_phase_id ?? ""]
            if (phase) setAssignments(phase.assignments)

            const rnboMap = Object.fromEntries(snapshot.rnbo_patches.map(item => [item.id, item]))
            const sheetMap = Object.fromEntries(snapshot.sheet_music.map(item => [item.id, item]))

            setRnboMap(rnboMap)
            setSheetMap(sheetMap)
        }

        fetchState()
    }, [])

    useEffect(() => {
        const unlisten = listen<string>("palette-item-removed", async () => {
            if (currentPhaseId) {
                const updated = await invoke<(SeatAssignment | null)[]>("get_assignments_for_phase", {
                    phaseId: currentPhaseId
                });
                setAssignments(updated);

                // Optional: also reload RNBO/Sheet maps if needed
            }
        });

        return () => {
            unlisten.then(f => f());
        };
    }, [currentPhaseId]);




    // Assign file to seat
    const handleClick = async (index: number) => {
        if (!currentPhaseId) {
            toast.warning("No active phase selected", {
                description: "You must select or create a phase before assigning files.",
            })
            return
        }

        try {
            const selectedFile = await invoke<{
                id: string
                file_type: "rnbo" | "sheet"
            }>("get_selected_file")

            if (!selectedFile) {
                console.log("No file selected.")
                return
            }

            const currentAssignment = assignments[index]
            const isAlreadyAssigned =
                selectedFile.file_type === "rnbo"
                    ? currentAssignment?.rnbo_id === selectedFile.id
                    : currentAssignment?.sheet_id === selectedFile.id

            if (isAlreadyAssigned) {
                // Unassign the file
                await invoke("unassign_file_from_seat", {
                    phaseId: currentPhaseId,
                    seatIndex: index,
                    fileType: selectedFile.file_type,
                })
                console.log(`Unassigned ${selectedFile.file_type} from seat ${index}`)
            } else {
                // Assign the file
                await invoke("assign_selected_file_to_seat", {
                    phaseId: currentPhaseId,
                    seatIndex: index,
                    fileId: selectedFile.id,
                    fileType: selectedFile.file_type,
                })
                console.log(`Assigned ${selectedFile.file_type} ${selectedFile.id} to seat ${index}`)
            }

            // Always reload assignments afterward
            const updated = await invoke<(SeatAssignment | null)[]>("get_assignments_for_phase", {
                phaseId: currentPhaseId,
            })
            setAssignments(updated)
        } catch (err) {
            console.error("Error assigning or unassigning file:", err)
        }
    }


    // Listen for phase changes and update assignments accordingly
    useEffect(() => {
        const unlisten = listen<string>("phase-changed", async (event) => {
            const newPhaseId = event.payload
            setCurrentPhaseId(newPhaseId)

            if (newPhaseId) {
                const newAssignments = await invoke<(SeatAssignment | null)[]>("get_assignments_for_phase", {
                    phaseId: newPhaseId
                })
                setAssignments(newAssignments)
            } else {
                setAssignments([])
            }
        })

        return () => {
            unlisten.then(f => f()) // cleanup
        }
    }, [])

    // Fetch RNBO details for each assignment
    useEffect(() => {
        const loadRNBODetails = async () => {
            const newMap: Record<string, RNBOPaletteItem> = {}

            for (const assignment of assignments) {
                const id = assignment?.rnbo_id
                if (id && !rnboMap[id]) {
                    try {
                        const item = await invoke<RNBOPaletteItem>("get_rnbo_item", { id })
                        newMap[id] = item
                    } catch (err) {
                        console.error(`Failed to fetch RNBO item ${id}:`, err)
                    }
                }
            }

            setRnboMap((prev) => ({ ...prev, ...newMap }))
        }

        if (assignments.length > 0) {
            loadRNBODetails()
        }
    }, [assignments])

    useEffect(() => {
        const loadSheetDetails = async () => {
            const newMap: Record<string, SheetPaletteItem> = {}

            for (const assignment of assignments) {
                const id = assignment?.sheet_id
                if (id && !sheetMap[id]) {
                    try {
                        const item = await invoke<SheetPaletteItem>("get_sheet_item", { id })
                        newMap[id] = item
                    } catch (err) {
                        console.error(`Failed to fetch Sheet item ${id}:`, err)
                    }
                }
            }

            setSheetMap((prev) => ({ ...prev, ...newMap }))
        }

        if (assignments.length > 0) {
            loadSheetDetails()
        }
    }, [assignments])



    if (!config) return <div>Loading canvas...</div>
    const seats = Array.from({ length: config.rows * config.columns })

    return (
        <div className="flex justify-center items-center h-full w-full">

            <AspectRatio
                ratio={16 / 9}
                className="bg-gray-200 rounded-md flex items-center justify-center overflow-hidden">
                {/* Floating top-right label */}
                {hoveredSeatIndex !== null && (
                    <div className="absolute top-2 left-3 text-sm text-zinc-600 bg-white/80 px-2 py-1 rounded shadow-sm pointer-events-none">
                        <div>
                            <strong>Seat {hoveredSeatIndex + 1}</strong>
                        </div>
                        <div>
                            RNBO:{" "}
                            {assignments[hoveredSeatIndex]?.rnbo_id
                                ? rnboMap[assignments[hoveredSeatIndex]!.rnbo_id!]?.label
                                : "—"}
                        </div>
                        <div>
                            Sheet:{" "}
                            {assignments[hoveredSeatIndex]?.sheet_id
                                ? sheetMap[assignments[hoveredSeatIndex]!.sheet_id!]?.label
                                : "—"}
                        </div>
                    </div>
                )}
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${config.columns}, 1fr)` }}>
                    {seats.map((_, i) => {
                        const assignment = currentPhaseId ? assignments[i] : null
                        const rnboItem = assignment?.rnbo_id ? rnboMap[assignment.rnbo_id] : null
                        const sheetItem = assignment?.sheet_id ? sheetMap[assignment.sheet_id] : null

                        return (
                            <div
                                key={i}
                                onClick={() => handleClick(i)}
                                onMouseEnter={() => setHoveredSeatIndex(i)}
                                onMouseLeave={() => setHoveredSeatIndex(null)}
                                className="w-8 h-8 rounded-full transition-colors duration-150 hover:cursor-pointer"
                                style={{
                                    backgroundColor: rnboItem?.color ?? "#b5b5b5",
                                    boxShadow: sheetItem ? `0 0 0 3px ${sheetItem.color}` : undefined,
                                }}
                            />

                        )
                    })}

                </div>
            </AspectRatio>
        </div>

    )
}

