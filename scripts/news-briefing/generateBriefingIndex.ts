import { readdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { formatBriefingTitle } from "./formatBriefingTitle.ts"

/** Generate the public briefing index from dated briefing JSON files in a directory. */
export function generateBriefingIndex(
  /** The directory containing public briefing JSON files. */
  briefingDirectoryPath: string,
): void {
  const datePattern = /^\d{4}-\d{2}-\d{2}\.json$/
  const files = readdirSync(briefingDirectoryPath)
    .filter(fileName => datePattern.test(fileName))
    .sort()
    .reverse()

  const index = files.map(fileName => {
    const date = fileName.replace(".json", "")
    return { date, title: formatBriefingTitle(date) }
  })

  writeFileSync(
    path.join(briefingDirectoryPath, "index.json"),
    JSON.stringify(index, null, 2) + "\n",
  )
}
