import { useState } from "react"
import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

type PaletteItem = {
  id: string
  label: string
  color: string
}

type PaletteSectionProps = {
  title: string
  colorPool?: string[]
}

export default function PaletteSection({ title, colorPool }: PaletteSectionProps) {
  const [items, setItems] = useState<PaletteItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [itemToDelete, setItemToDelete] = useState<PaletteItem | null>(null)

  const defaultColors = ["bg-blue-500", "bg-green-500", "bg-pink-500", "bg-yellow-500", "bg-purple-500"]
  const colors = colorPool || defaultColors

  const addDummyItem = () => {
    const newItem: PaletteItem = {
      id: crypto.randomUUID(),
      label: `${title} ${items.length + 1}`,
      color: colors[items.length % colors.length],
    }
    setItems([...items, newItem])
  }

  const deleteItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm text-zinc-300 font-medium">{title}</h3>
        <Button size="sm" variant="outline" onClick={addDummyItem}>
          + Add
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "relative flex items-center px-3 py-1 pr-6 rounded-full text-xs text-white cursor-pointer transition select-none",
              item.color,
              selectedId === item.id ? "ring-2 ring-white" : "opacity-80 hover:opacity-100"
            )}
            onClick={() => setSelectedId(item.id)}
          >
            {item.label}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setItemToDelete(item)
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-white hover:text-zinc-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </AlertDialogTrigger>
            </AlertDialog>
          </div>
        ))}
      </div>

      {itemToDelete && (
        <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{itemToDelete.label}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Are you sure you want to remove this item?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-700 text-white"
                onClick={() => {
                  deleteItem(itemToDelete.id)
                  setItemToDelete(null)
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
