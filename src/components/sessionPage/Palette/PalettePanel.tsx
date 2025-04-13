import PaletteSection from "@/components/sessionPage/Palette/PaletteSection"

export default function PalettePanel() {
  return (
    <div className="flex flex-row gap-4 h-full overflow-y-auto">
      <div className="flex-1 overflow-y-auto pr-2">
        <PaletteSection title="RNBO Patches" />
      </div>

      <div className="w-px bg-zinc-700" />

      <div className="flex-1 overflow-y-auto pl-2">
        <PaletteSection title="Sheet Music" />
      </div>
    </div>
  )
}
