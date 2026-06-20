import { Effect } from "effect"
import { getFinalBriefingPath } from "./briefingPaths.ts"
import { decodeJsonWithSchema } from "./decodeJsonWithSchema.ts"
import { getPreviousDate } from "./getPreviousDate.ts"
import { FileSystemService, toError } from "./runtimeServices.ts"
import { FinalBriefingSchema } from "./schemas.ts"

/**
 * Read the previous day's final briefing and return its story headlines so the
 * selection step can avoid repeating stories. Returns an empty list when the
 * previous briefing is missing or unreadable, since the repetition check is
 * supplementary and should never block synthesis.
 */
export function readPreviousBriefingHeadlinesEffect(
  /** The directory where final briefings are written. */
  briefingDirectoryPath: string,
  /** The briefing date being synthesized. */
  date: string,
): Effect.Effect<string[], never, FileSystemService> {
  return Effect.gen(function* () {
    const fileSystem = yield* FileSystemService
    const previousDate = getPreviousDate(date)
    const previousBriefingPath = getFinalBriefingPath(briefingDirectoryPath, previousDate)
    const exists = yield* fileSystem.exists(previousBriefingPath)

    if (!exists) return []

    const contents = yield* fileSystem.readText(previousBriefingPath)
    const previousBriefing = yield* Effect.try({
      catch: error => toError(error),
      try: () => decodeJsonWithSchema(FinalBriefingSchema, contents, "previous briefing"),
    })

    return previousBriefing.sections.flatMap(section =>
      section.stories.map(story => story.headline),
    )
  }).pipe(Effect.catchAll(() => Effect.succeed([] as string[])))
}
