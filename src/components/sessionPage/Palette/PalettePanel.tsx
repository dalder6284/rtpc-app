import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
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
import { Card } from "@/components/ui/card" // assuming you have one
import { AddPaletteDialog } from "./AddPaletteDialog"
import { invoke } from "@tauri-apps/api/core"

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

type PaletteItemBase = {
  id: string
  label: string
  path: string
  color: string
}

type Selection =
  | { type: "rnbo"; id: string }
  | { type: "sheet"; id: string }
  | null

export default function PalettePanel() {
  const [rnboItems, setRnboItems] = useState<RNBOPaletteItem[]>([])
  const [sheetItems, setSheetItems] = useState<SheetPaletteItem[]>([])
  const [selected, setSelected] = useState<Selection>(null)
  const [itemToDelete, setItemToDelete] = useState<{ type: "rnbo" | "sheet"; item: PaletteItemBase } | null>(null)
  const [dialogTypeOpen, setDialogTypeOpen] = useState<"rnbo" | "sheet" | null>(null)


  // const colors = ["bg-blue-500", "bg-green-500", "bg-pink-500", "bg-yellow-500", "bg-purple-500"]

  // const addDummyItem = (type: "rnbo" | "sheet") => {
  //   const list = type === "rnbo" ? rnboItems : sheetItems
  //   const newItem: PaletteItem = {
  //     id: crypto.randomUUID(),
  //     label: `${type === "rnbo" ? "Patch" : "Sheet"} ${list.length + 1}`,
  //     color: colors[list.length % colors.length],
  //   }

  //   if (type === "rnbo") {
  //     setRnboItems([...rnboItems, newItem])
  //   } else {
  //     setSheetItems([...sheetItems, newItem])
  //   }
  // }

  const handleSubmit = async (item: {
    type: "rnbo" | "sheet"
    label: string
    path: string
    color: string
  }) => {
    const id = crypto.randomUUID()

    if (item.type === "rnbo") {
      const newItem: RNBOPaletteItem = {
        id,
        label: item.label,
        path: item.path,
        color: item.color,
      }

      try {
        await invoke("add_rnbo_file", { item: newItem })
        setRnboItems((prev) => [...prev, newItem])
      } catch (err) {
        console.error("Failed to add RNBO item:", err)
      }

    } else {
      const newItem: SheetPaletteItem = {
        id,
        label: item.label,
        path: item.path,
        color: item.color,
      }

      try {
        await invoke("add_sheet_file", { item: newItem })
        setSheetItems((prev) => [...prev, newItem])
      } catch (err) {
        console.error("Failed to add Sheet item:", err)
      }
    }

    console.log("Added palette item:", item)
  }


  const handleSelect = async (type: "rnbo" | "sheet", id: string) => {
    const alreadySelected = selected?.type === type && selected.id === id
  
    if (alreadySelected) {
      try {
        await invoke("clear_selected_file")
        setSelected(null)
      } catch (err) {
        console.error("Failed to clear selected file:", err)
      }
    } else {
      try {
        await invoke("select_palette_file", { id, fileType: type })
        setSelected({ type, id })
      } catch (err) {
        console.error("Failed to select file:", err)
      }
    }
  }
  

  const handleDelete = async (type: "rnbo" | "sheet", id: string) => {
    try {
      if (type === "rnbo") {
        await invoke("remove_rnbo_file", { id })
        setRnboItems((prev) => prev.filter((item) => item.id !== id))
      } else {
        await invoke("remove_sheet_file", { id })
        setSheetItems((prev) => prev.filter((item) => item.id !== id))
      }

      if (selected?.type === type && selected.id === id) {
        setSelected(null)
      }
    } catch (err) {
      console.error(`Failed to remove ${type} file:`, err)
    }
  }


  const renderSection = (title: string, type: "rnbo" | "sheet", items: PaletteItemBase[]) => (
    <div className="mb-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm text-zinc-300 font-medium">{title}</h3>
        <Button size="sm" variant="outline" onClick={() => setDialogTypeOpen(type)}>
          + Add
        </Button>
      </div>

      <Card className="flex-1 overflow-y-auto shadow-none border-none bg-transparent pr-1">
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "relative flex items-center px-3 py-1 pr-6 rounded-full text-xs text-white cursor-pointer transition select-none",
                selected?.type === type && selected.id === item.id
                  ? "ring-2 ring-white"
                  : "opacity-80 hover:opacity-100"
              )}
              style={{ backgroundColor: item.color }}
              onClick={() => handleSelect(type, item.id)}
            >
              {item.label}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setItemToDelete({ type, item })
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
      </Card>
    </div>
  )


  return (
    <Card className="p-4 h-[400px] overflow-y-auto shadow-none border-none rounded-md bg-transparent">
      <div className="flex flex-row gap-6">
        <div className="flex-1">{renderSection("RNBO Patches", "rnbo", rnboItems)}</div>
        <div className="flex-1">{renderSection("Sheet Music", "sheet", sheetItems)}</div>
      </div>

      {dialogTypeOpen && (
        <AddPaletteDialog
          type={dialogTypeOpen}
          isOpen={!!dialogTypeOpen}
          setOpen={(v) => !v && setDialogTypeOpen(null)}
          onSubmit={handleSubmit}
        />
      )}

      {itemToDelete && (
        <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{itemToDelete.item.label}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Are you sure you want to remove this item?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-700 text-white"
                onClick={() => {
                  console.log("Deleted item:", itemToDelete.item.id)
                  handleDelete(itemToDelete.type, itemToDelete.item.id)
                  setItemToDelete(null)
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  )
}
