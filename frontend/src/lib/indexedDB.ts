// src/lib/indexedDB.ts
const DB_NAME = "rtpc-assets-db";
const DB_VERSION = 1;
// const STORE = "files";

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains("patches")) {
                db.createObjectStore("patches", { keyPath: "name" });
            }
            if (!db.objectStoreNames.contains("sheetMusic")) {
                db.createObjectStore("sheetMusic", { keyPath: "name" });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function withStore<R>(
    storeName: string,
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => IDBRequest<R>
): Promise<R> {
    return openDB().then((db) => {
        const tx = db.transaction(storeName, mode)
        const store = tx.objectStore(storeName)
        const req = callback(store)
        return new Promise<R>((res, rej) => {
            req.onsuccess = () => res(req.result)
            req.onerror = () => rej(req.error)
        })
    })
}

export function savePatch(name: string, data: Blob | ArrayBuffer) {
    return withStore<IDBValidKey>("patches", "readwrite", (s) => s.put({ name, data }))
}

export function loadPatch(name: string) {
    return withStore<{ name: string; data: Blob | ArrayBuffer } | undefined>(
        "patches", "readonly", (s) => s.get(name)
    ).then(rec => rec?.data)
}

export function saveSheet(name: string, data: Blob | ArrayBuffer) {
    return withStore<IDBValidKey>("sheetMusic", "readwrite", (s) => s.put({ name, data }))
}

export function loadSheet(name: string) {
    return withStore<{ name: string; data: Blob | ArrayBuffer } | undefined>(
        "sheetMusic", "readonly", (s) => s.get(name)
    ).then(rec => rec?.data)
}


function listStoredFiles(
    storeName: "patches" | "sheetMusic"
): Promise<string[]> {
    return withStore<IDBValidKey[]>(storeName, "readonly", (store) =>
        store.getAllKeys()
    ).then((keys) => keys.map((k) => String(k)))
}

export const listStoredPatches  = () => listStoredFiles("patches")
export const listStoredSheets   = () => listStoredFiles("sheetMusic")



