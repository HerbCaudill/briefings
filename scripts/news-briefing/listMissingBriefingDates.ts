import { existsSync, readdirSync } from "node:fs"
import { getBriefingDateFromFileName, isDatedBriefingJsonFileName } from "./briefingPaths.ts"
import type { ListMissingBriefingDatesArgs } from "./types.ts"

/** List raw briefing dates that do not yet have final briefing JSON files. */
export function listMissingBriefingDates(
  /** The raw and final briefing directories to compare. */
  args: ListMissingBriefingDatesArgs,
): string[] {
  if (!existsSync(args.rawDirectoryPath)) return []

  const rawDates = readdirSync(args.rawDirectoryPath)
    .filter(isDatedBriefingJsonFileName)
    .map(getBriefingDateFromFileName)
    .sort()
  const finalDates = new Set(
    existsSync(args.briefingDirectoryPath)
      ? readdirSync(args.briefingDirectoryPath)
          .filter(isDatedBriefingJsonFileName)
          .map(getBriefingDateFromFileName)
      : [],
  )

  return rawDates.filter(date => !finalDates.has(date))
}
