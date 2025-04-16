import { useEffect, useState } from "react"

import { AspectRatio } from "@/components/ui/aspect-ratio"
import { invoke } from "@tauri-apps/api/core"

type SessionConfig = {
    name: string
    path: string
    rows: number
    columns: number
}

export default function AudienceCanvas() {
    const [config, setConfig] = useState<SessionConfig | null>(null)

    useEffect(() => {
        invoke<SessionConfig>("get_session_config").then(setConfig)
    }, [])

    if (!config) return <div>Loading canvas...</div>

    const seats = Array.from({ length: config.rows * config.columns })

    const handleClick = (index: number) => {
        console.log(`Seat ${index} clicked`)
        // You can later do: assign a file, mark selected, etc.
    }

    return (
        <AspectRatio
            ratio={16 / 9}
            className="bg-zinc-800 rounded-md flex items-center justify-center overflow-hidden">
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${config.columns}, 1fr)` }}>
                {seats.map((_, i) => (
                    <div
                        key={i}
                        className="w-7 h-7 bg-zinc-300 rounded-full transition-colors duration-150 hover:ring-3 hover:ring-white hover:cursor-pointer"
                        onClick={() => handleClick(i)}
                    />
                ))}
            </div>
        </AspectRatio>
    )
}

