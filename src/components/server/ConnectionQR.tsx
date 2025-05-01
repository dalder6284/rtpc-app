import { useEffect, useState } from "react"
import QRCode from "react-qr-code" // ✅ import the QR component
import { invoke } from "@tauri-apps/api/core"
import { Skeleton } from "@/components/ui/skeleton"

export default function ConnectionQR({ port, serverOn }: { port: number, serverOn: boolean }) {
  const [ip, setIp] = useState<string | null>(null)

  useEffect(() => {
    invoke<string>("get_local_ip")
      .then(setIp)
      .catch(err => console.error("Failed to get IP:", err))
  }, [])

  if (!serverOn || !ip) {
    return <Skeleton className="w-[256px] h-[256px] rounded-md" />
  }

  const url = `https://${ip}:${port}`

  return (
    <div className="flex flex-col items-center">
      <QRCode value={url} size={256} className="rounded-md bg-white p-2" />
      <p className="mt-2 text-xs text-zinc-500">{url}</p>
    </div>
  )
}
