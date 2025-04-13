import { AspectRatio } from "@/components/ui/aspect-ratio"

type AudienceCanvasProps = {
    rows: number
    columns: number
}

export default function AudienceCanvas({ rows, columns }: AudienceCanvasProps) {
    const seats = Array.from({ length: rows * columns })

    return (
        <AspectRatio ratio={16 / 9} className="bg-zinc-800 rounded-md flex items-center justify-center">
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                {seats.map((_, i) => (
                    <div key={i} className="w-5 h-5 bg-zinc-300 rounded-full" />
                ))}
            </div>
        </AspectRatio>
    )
}

