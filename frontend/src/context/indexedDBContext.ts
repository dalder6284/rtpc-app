// src/context/indexedDBContext.ts
import { createContext } from "react";

export interface IndexedDBContextType {
  /** the list of file-names you’ve cached */
  patchFiles: string[]
  sheetFiles: string[]
}

export const IndexedDBContext = createContext<IndexedDBContextType | null>(null);
