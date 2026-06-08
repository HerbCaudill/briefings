import { Effect } from "effect"
import { getSelectionBriefingPath } from "./briefingPaths.ts"
import { hydrateSelectedStories } from "./hydrateSelectedStories.ts"
import { FileSystemService, HttpService, LoggingService, toError } from "./runtimeServices.ts"
import type { BriefingSelection, HydratedBriefingSelection, RawBriefing } from "./types.ts"

/** Hydrate selected stories with article bodies and persist the hydrated selection. */
export function hydrateBriefingSelectionEffect(
  /** The raw briefing directory path. */
  rawDirectoryPath: string,
  /** The raw briefing document. */
  rawBriefing: RawBriefing,
  /** The selected compact story list. */
  selection: BriefingSelection,
): Effect.Effect<
  HydratedBriefingSelection,
  Error,
  FileSystemService | HttpService | LoggingService
> {
  return Effect.gen(function* () {
    const fileSystem = yield* FileSystemService
    const http = yield* HttpService
    const logging = yield* LoggingService
    const selectionPath = getSelectionBriefingPath(rawDirectoryPath, rawBriefing.date)
    const hydratedSelection = yield* Effect.tryPromise({
      catch: error => toError(error),
      try: () =>
        hydrateSelectedStories(
          rawBriefing,
          selection,
          url => Effect.runPromise(http.fetchPageHtml(url)),
          message => Effect.runSync(logging.log(message)),
        ),
    })

    yield* fileSystem.writeText(selectionPath, `${JSON.stringify(hydratedSelection, null, 2)}\n`)

    return hydratedSelection
  })
}
