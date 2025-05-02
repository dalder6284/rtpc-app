import React, { useEffect, useState } from "react"
import { IndexedDBContext, IndexedDBContextType } from "./indexedDBContext"
import { listStoredPatches, listStoredSheets } from "@/lib/indexedDB"

export function IndexedDBProvider({ children }: { children: React.ReactNode }) {
    // in IndexedDBProvider.tsx
    const [patchFiles, setPatchFiles] = useState<string[]>([])
    const [sheetFiles, setSheetFiles] = useState<string[]>([])

    useEffect(() => {
        listStoredPatches().then(setPatchFiles).catch(() => setPatchFiles([]))
        listStoredSheets().then(setSheetFiles).catch(() => setSheetFiles([]))
    }, [])

    // use the interface here to type-check your value
    const value: IndexedDBContextType = { patchFiles, sheetFiles }

    return (
        <IndexedDBContext.Provider value={value}>
            {children}
        </IndexedDBContext.Provider>
    )
}
