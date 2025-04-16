import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { open } from "@tauri-apps/plugin-dialog"

interface AddPaletteDialogProps {
    isOpen: boolean
    setOpen: (value: boolean) => void
    type: "rnbo" | "sheet"
    onSubmit: (item: { type: "rnbo" | "sheet"; label: string; path: string; color: string }) => void
}

export function AddPaletteDialog({ isOpen, setOpen, type, onSubmit }: AddPaletteDialogProps) {
    const [label, setLabel] = useState("")
    const [path, setPath] = useState("")
    const [color, setColor] = useState("#3b82f6") // blue-500 default
  
    const handleChooseFile = async () => {
      const result = await open({ multiple: false })
      if (typeof result === "string") {
        setPath(result)
      }
    }
  
    const handleSubmit = () => {
      if (!label.trim() || !path) return
  
      onSubmit({ type, label: label.trim(), path, color })
      setOpen(false)
      setLabel("")
      setPath("")
      setColor("#3b82f6")
    }
  
    return (
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Palette Item</DialogTitle>
          </DialogHeader>
  
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="label" className="text-right">Label</Label>
              <Input
                id="label"
                className="col-span-3"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Drum Loop"
              />
            </div>
  
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">File</Label>
              <div className="col-span-3 flex gap-2">
                <Input
                  value={path}
                  onChange={() => {}}
                  readOnly
                  placeholder="Choose a file"
                  className="flex-1"
                />
                <Button variant="outline" onClick={handleChooseFile}>Browse</Button>
              </div>
            </div>
  
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="color" className="text-right">Color</Label>
              <Input
                id="color"
                type="color"
                className="col-span-3 h-10"
                value={color}
                onChange={(e) => setColor(e.target.value)}
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