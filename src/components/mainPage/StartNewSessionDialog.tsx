import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { save } from '@tauri-apps/plugin-dialog'


interface StartNewSessionDialogProps {
  isOpen: boolean
  setOpen: (value: boolean) => void
  onSubmit: (data: {
    name: string
    path: string
    rows: number
    columns: number
  }) => void
}

export function StartNewSessionDialog({
  isOpen,
  setOpen,
  onSubmit
}: StartNewSessionDialogProps) {
  const [name, setName] = useState("")
  const [path, setPath] = useState("")
  const [rows, setRows] = useState("5")
  const [columns, setColumns] = useState("5")



  const handleSubmit = () => {
    if (!name || !path || !rows || !columns) return

    const r = Math.min(8, Math.max(1, parseInt(rows)))
    const c = Math.min(8, Math.max(1, parseInt(columns)))
    const size = r * c

    if (isNaN(size) || size <= 0) return

    onSubmit({ name: name, path: path, rows: r, columns: c })
    setOpen(false)

    // Optionally reset
    setName("")
    setPath("")
    setRows("5")
    setColumns("5")
  }

  const handleChoosePath = async () => {
    const selected = await save({
      filters: [
        { name: "JSON", extensions: ["json"] }
      ],
      defaultPath: "session-config.json"
    })
  
    if (selected) {
      setPath(selected)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start New Session</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="session-name" className="text-right">Name</Label>
            <Input
              id="session-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. my-session"
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="json-path" className="text-right">Save Location</Label>
            <div className="col-span-3 flex gap-2">
              <Input
                id="json-path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="Choose a file..."
                className="flex-1"
              />
              <Button variant="outline" onClick={handleChoosePath}>
                Browse
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rows" className="text-right">Rows</Label>
            <Input
              id="rows"
              type="number"
              min={1}
              max={8}
              value={rows}
              onChange={(e) => setRows(e.target.value)}
              placeholder="e.g. 5"
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="columns" className="text-right">Columns</Label>
            <Input
              id="columns"
              type="number"
              min={1}
              max={8}
              value={columns}
              onChange={(e) => setColumns(e.target.value)}
              placeholder="e.g. 5"
              className="col-span-3"
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
