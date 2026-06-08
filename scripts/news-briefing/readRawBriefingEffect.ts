import { Effect } from "effect"
import { getRawBriefingPath } from "./briefingPaths.ts"
import { decodeJsonWithSchema } from "./decodeJsonWithSchema.ts"
import { FileSystemService } from "./runtimeServices.ts"
import { RawBriefingSchema } from "./schemas.ts"
import type { RawBriefing } from "./types.ts"

/** Read and schema-decode the raw briefing for a synthesis run. */
export function readRawBriefingEffect(
  /** The raw briefing directory path. */
  rawDirectoryPath: string,
  /** The briefing date to read. */
  date: string,
): Effect.Effect<RawBriefing, Error, FileSystemService> {
  return Effect.gen(function* () {
    const fileSystem = yield* FileSystemService
    const rawBriefingPath = getRawBriefingPath(rawDirectoryPath, date)
    const exists = yield* fileSystem.exists(rawBriefingPath)

    if (!exists) {
      return yield* Effect.fail(new Error(`Missing raw briefing file: ${rawBriefingPath}`))
    }

    const contents = yield* fileSystem.readText(rawBriefingPath)
    const decodedRawBriefing = yield* Effect.try({
      catch: error => (error instanceof Error ? error : new Error(String(error))),
      try: () => decodeJsonWithSchema(RawBriefingSchema, contents, "raw briefing"),
    })

    return {
      articles: [...decodedRawBriefing.articles],
      date: decodedRawBriefing.date,
    }
  })
}
