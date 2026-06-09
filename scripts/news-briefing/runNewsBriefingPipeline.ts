import { Context, Effect, Layer } from "effect"
import { formatElapsedSeconds } from "./formatElapsedSeconds.ts"
import { formatTotalCandidateLine } from "./formatTotalCandidateLine.ts"
import { ClockService, LoggingService, toError } from "./runtimeServices.ts"
import type { RawBriefing, RunNewsBriefingPipelineArgs } from "./types.ts"

const PipelineStageServiceTag = Context.GenericTag<PipelineStageService>(
  "news-briefing/PipelineStageService",
)

/** Create a pipeline stage service layer from injectable Effect runners. */
export function makePipelineStageServiceLive(
  /** The Effect-backed pipeline stage runners. */
  runners: PipelineStageService,
) {
  return Layer.succeed(PipelineStageServiceTag, PipelineStageServiceTag.of(runners))
}

/** Run the fetch stage for one date, then synthesize every missing final briefing. */
export async function runNewsBriefingPipeline(
  /** The pipeline dependencies and target date. */
  args: RunNewsBriefingPipelineArgs,
): Promise<void> {
  const services = Layer.mergeAll(
    PipelineStageService.LiveFromRunners({
      clearExistingBriefingFiles: date =>
        Effect.tryPromise({
          catch: error => toError(error),
          try: () => args.clearExistingBriefingFiles(date),
        }),
      commitAndPushGeneratedBriefings: dates =>
        Effect.tryPromise({
          catch: error => toError(error),
          try: () => args.commitAndPushGeneratedBriefings(dates),
        }),
      listMissingBriefingDates: Effect.try({
        catch: error => toError(error),
        try: () => args.listMissingBriefingDates(),
      }),
      runFetchStage: date =>
        Effect.tryPromise({
          catch: error => toError(error),
          try: () => args.runFetchStage(date),
        }),
      runSynthesisStage: date =>
        Effect.tryPromise({
          catch: error => toError(error),
          try: () => args.runSynthesisStage(date),
        }),
    }),
    ClockService.LiveFromNow(args.now ?? Date.now),
    LoggingService.LiveFromLogger(args.log ?? (() => undefined)),
  )

  await runNewsBriefingPipelineEffect({ date: args.date }).pipe(
    Effect.provide(services),
    Effect.runPromise,
  )
}

/** Run the top-level briefing pipeline as an Effect. */
export function runNewsBriefingPipelineEffect(
  /** The target briefing date. */
  args: RunNewsBriefingPipelineEffectArgs,
): Effect.Effect<void, Error, PipelineStageService | ClockService | LoggingService> {
  return Effect.gen(function* () {
    const stages = yield* PipelineStageService
    const clock = yield* ClockService
    const logging = yield* LoggingService
    const pipelineStart = yield* clock.now

    yield* logging.log(`Clearing existing briefing files for ${args.date}...`)
    const clearStart = yield* clock.now
    yield* stages.clearExistingBriefingFiles(args.date)
    const clearEnd = yield* clock.now
    yield* logging.log(`done (${formatElapsedSeconds(clearEnd - clearStart)})`)
    yield* logging.log("")

    yield* logging.log("Fetching candidates...")
    yield* logging.log("")
    const fetchStart = yield* clock.now
    const rawBriefing = yield* stages.runFetchStage(args.date)
    const fetchEnd = yield* clock.now
    yield* logging.log("-------------------------")
    yield* logging.log(formatTotalCandidateLine(rawBriefing.articles.length))
    yield* logging.log("")
    yield* logging.log(`done (${formatElapsedSeconds(fetchEnd - fetchStart)})`)
    yield* logging.log("")

    const missingBriefingDates = yield* stages.listMissingBriefingDates
    yield* Effect.forEach(missingBriefingDates, date => stages.runSynthesisStage(date), {
      concurrency: 1,
      discard: true,
    })

    if (missingBriefingDates.length > 0)
      yield* stages.commitAndPushGeneratedBriefings(missingBriefingDates)

    const pipelineEnd = yield* clock.now
    yield* logging.log(`Briefing complete (${formatElapsedSeconds(pipelineEnd - pipelineStart)})`)
  })
}

/** Effect-backed stage runners for the top-level pipeline. */
export type PipelineStageService = {
  /** Delete generated files for a date. */
  clearExistingBriefingFiles: (date: string) => Effect.Effect<void, Error>
  /** Commit and push generated briefing files. */
  commitAndPushGeneratedBriefings: (dates: string[]) => Effect.Effect<void, Error>
  /** List raw dates that are missing final briefing files. */
  listMissingBriefingDates: Effect.Effect<string[], Error>
  /** Fetch and persist raw briefing candidates for a date. */
  runFetchStage: (date: string) => Effect.Effect<RawBriefing, Error>
  /** Synthesize the final briefing for a date. */
  runSynthesisStage: (date: string) => Effect.Effect<string, Error>
}

/** Arguments for the top-level Effect pipeline. */
export type RunNewsBriefingPipelineEffectArgs = {
  /** The briefing date requested by the CLI. */
  date: string
}

export const PipelineStageService = Object.assign(PipelineStageServiceTag, {
  LiveFromRunners: makePipelineStageServiceLive,
})
