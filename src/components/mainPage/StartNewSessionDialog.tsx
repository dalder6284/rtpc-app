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

interface StartNewSessionDialogProps {
  open: boolean
  setOpen: (value: boolean) => void
  onSubmit: (data: {
    name: string
    path: string
    size: number
  }) => void
}

export function StartNewSessionDialog({
  open,
  setOpen,
  onSubmit
}: StartNewSessionDialogProps) {
  const [name, setName] = useState("")
  const [path, setPath] = useState("")
  const [audienceSize, setAudienceSize] = useState("")

  const handleSubmit = () => {
    if (!name || !path || !audienceSize) return
    const size = parseInt(audienceSize)
    if (isNaN(size) || size <= 0) return

    onSubmit({ name, path, size })
    setOpen(false)

    // Optionally reset fields
    setName("")
    setPath("")
    setAudienceSize("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            <Input
              id="json-path"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="e.g. /sessions/my-session.json"
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="audience-size" className="text-right">Audience Size</Label>
            <Input
              id="audience-size"
              type="number"
              value={audienceSize}
              onChange={(e) => setAudienceSize(e.target.value)}
              placeholder="e.g. 25"
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
