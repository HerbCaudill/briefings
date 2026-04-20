import { existsSync, readdirSync } from "node:fs"
import type { ListMissingBriefingDatesArgs } from "./types.ts"

/** List raw briefing dates that do not yet have final briefing JSON files. */
export function listMissingBriefingDates(
  /** The raw and final briefing directories to compare. */
  args: ListMissingBriefingDatesArgs,
): string[] {
  if (!existsSync(args.rawDirectoryPath)) {
    return []
  }

  const rawDates = readdirSync(args.rawDirectoryPath)
    .filter(fileName => /^\d{4}-\d{2}-\d{2}\.json$/.test(fileName))
    .map(fileName => fileName.replace(/\.json$/, ""))
    .sort()
  const finalDates = new Set(
    existsSync(args.briefingDirectoryPath) ?
      readdirSync(args.briefingDirectoryPath)
        .filter(fileName => /^\d{4}-\d{2}-\d{2}\.json$/.test(fileName))
        .map(fileName => fileName.replace(/\.json$/, ""))
    : [],
  )

  return rawDates.filter(date => !finalDates.has(date))
}
