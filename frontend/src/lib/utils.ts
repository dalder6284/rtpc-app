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