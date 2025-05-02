import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function float32ToBase64(buffer: Float32Array): string {
  const byteArray = new Uint8Array(buffer.buffer);
  let binary = '';

  for (let i = 0; i < byteArray.length; i += 1024) {
    binary += String.fromCharCode(...byteArray.slice(i, i + 1024));
  }

  return btoa(binary);
}

export async function computeHash(data: Blob | ArrayBuffer): Promise<string> {
  const buf = data instanceof Blob ? await data.arrayBuffer() : data
  const hashBuffer = await crypto.subtle.digest("SHA-256", buf)
  // convert to hex
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export function concatenate(chunks: ArrayBuffer[]): ArrayBuffer {
  const total = chunks.reduce((sum, c) => sum + c.byteLength, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(new Uint8Array(c), offset)
    offset += c.byteLength
  }
  return out.buffer
}