import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { getBriefingDateFromFileName, isDatedBriefingJsonFileName } from "./briefingPaths.ts"
import { decodeJsonWithSchema } from "./decodeJsonWithSchema.ts"
import { FinalBriefingSchema } from "./schemas.ts"
import type { CollectRecentBriefingSourceUrlsArgs } from "./types.ts"

const millisecondsPerDay = 86_400_000

/** Collect source URLs cited by final briefings in the lookback window before a date. */
export function collectRecentBriefingSourceUrls(
  /** The final briefing directory, target date, and lookback window in days. */
  args: CollectRecentBriefingSourceUrlsArgs,
): Set<string> {
  const sourceUrls = new Set<string>()
  const briefingTimestamp = Date.parse(`${args.date}T00:00:00Z`)

  if (!existsSync(args.briefingDirectoryPath) || Number.isNaN(briefingTimestamp)) return sourceUrls

  const earliestDate = new Date(briefingTimestamp - args.lookbackDays * millisecondsPerDay)
    .toISOString()
    .slice(0, 10)

  for (const fileName of readdirSync(args.briefingDirectoryPath)) {
    if (!isDatedBriefingJsonFileName(fileName)) continue

    const fileDate = getBriefingDateFromFileName(fileName)

    if (fileDate >= args.date || fileDate < earliestDate) continue

    let briefing
    try {
      const contents = readFileSync(path.join(args.briefingDirectoryPath, fileName), "utf8")
      briefing = decodeJsonWithSchema(FinalBriefingSchema, contents, `final briefing ${fileDate}`)
    } catch {
      continue
    }

    for (const section of briefing.sections) {
      for (const story of section.stories) {
        for (const source of story.sources) {
          if (source.url) sourceUrls.add(source.url)
        }
      }
    }
  }

  return sourceUrls
}
