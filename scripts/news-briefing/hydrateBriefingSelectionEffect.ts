import { Effect } from "effect"
import { getSelectionBriefingPath } from "./briefingPaths.ts"
import { hydrateSelectedStories } from "./hydrateSelectedStories.ts"
import { FileSystemService, HttpService, LoggingService } from "./runtimeServices.ts"
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
    const selectionPath = getSelectionBriefingPath(rawDirectoryPath, rawBriefing.date)
    const hydratedSelection = yield* hydrateSelectedStories(rawBriefing, selection)

    yield* fileSystem.writeText(selectionPath, `${JSON.stringify(hydratedSelection, null, 2)}\n`)

    return hydratedSelection
  })
}
