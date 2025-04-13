"use client"

import { useState } from "react"
import AudienceCanvas from "@/components/sessionPage/AudienceCanvas/AudienceCanvas"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AudienceCanvasPanel() {
  const [rows, setRows] = useState(5)
  const [columns, setColumns] = useState(8)

  return (
    <div className="flex flex-col items-center justify-start h-full w-full max-w-[600px] mx-auto px-4 py-6 gap-6">
      <AudienceCanvas rows={rows} columns={columns} />

      <div className="flex gap-4">
        <div className="flex flex-col space-y-1">
          <Label htmlFor="rows" className="text-xs text-zinc-400">Rows</Label>
          <Input
            id="rows"
            type="number"
            value={rows}
            onChange={(e) => setRows(Math.min(8, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-20 h-8 text-sm"
          />
        </div>

        <div className="flex flex-col space-y-1">
          <Label htmlFor="columns" className="text-xs text-zinc-400">Columns</Label>
          <Input
            id="columns"
            type="number"
            value={columns}
            onChange={(e) => setColumns(Math.min(8, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-20 h-8 text-sm"
          />
        </div>
      </div>
    </div>
  )
}
