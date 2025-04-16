"use client"

import AudienceCanvas from "@/components/sessionPage/AudienceCanvas/AudienceCanvas"

export default function AudienceCanvasPanel() {

  return (
    <div className="flex flex-col items-center justify-start h-full w-full max-w-[600px] mx-auto px-4 py-6 gap-6">
      <AudienceCanvas />
    </div>
  )
}
