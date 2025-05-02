// src/components/MissingFilesList.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface MissingFilesListProps {
  missingPatchFiles: string[]
  missingSheetFiles: string[]
}

export function MissingFilesList({
  missingPatchFiles,
  missingSheetFiles,
}: MissingFilesListProps) {
  const hasMissing =
    missingPatchFiles.length > 0 || missingSheetFiles.length > 0

  // Invisible if there's nothing missing
  if (!hasMissing) return null

  return (
    <Card className="mb-4 bg-black text-white shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">Downloading Assets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {missingPatchFiles.length > 0 && (
          <div>
            <h4 className="font-semibold">RNBO Patches:</h4>
            <ul className="list-disc list-inside text-yellow-400">
              {missingPatchFiles.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        )}
        {missingSheetFiles.length > 0 && (
          <div>
            <h4 className="font-semibold">Sheet Music JSONs:</h4>
            <ul className="list-disc list-inside text-yellow-400">
              {missingSheetFiles.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
