import { readdirSync, writeFileSync } from "node:fs"
import {
  getBriefingDateFromFileName,
  getBriefingIndexPath,
  isDatedBriefingJsonFileName,
} from "./briefingPaths.ts"
import { formatBriefingTitle } from "./formatBriefingTitle.ts"

/** Generate the public briefing index from dated briefing JSON files in a directory. */
export function generateBriefingIndex(
  /** The directory containing public briefing JSON files. */
  briefingDirectoryPath: string,
): void {
  const files = readdirSync(briefingDirectoryPath)
    .filter(isDatedBriefingJsonFileName)
    .sort()
    .reverse()

  const index = files.map(fileName => {
    const date = getBriefingDateFromFileName(fileName)
    return { date, title: formatBriefingTitle(date) }
  })

  writeFileSync(getBriefingIndexPath(briefingDirectoryPath), JSON.stringify(index, null, 2) + "\n")
}
