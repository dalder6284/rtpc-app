// src/hooks/useIndexedDB.ts
import { useContext } from "react";
import { IndexedDBContext } from "@/context/indexedDBContext";

export function useIndexedDB() {
  const ctx = useContext(IndexedDBContext);
  if (!ctx) {
    throw new Error("useIndexedDB must be used within an IndexedDBProvider");
  }
  return ctx;
}
