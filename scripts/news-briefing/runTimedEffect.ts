import { Effect } from "effect"
import { formatElapsedSeconds } from "./formatElapsedSeconds.ts"
import { logMessageEffect } from "./logMessageEffect.ts"
import { ClockService, type LoggingService } from "./runtimeServices.ts"

/** Run an Effect and log its elapsed duration when it completes. */
export function runTimedEffect<Success, Failure, Requirements>(
  /** The Effect to time. */
  effect: Effect.Effect<Success, Failure, Requirements>,
): Effect.Effect<Success, Failure, Requirements | ClockService | LoggingService> {
  return Effect.gen(function* () {
    const clock = yield* ClockService
    const start = yield* clock.now
    const result = yield* effect
    const end = yield* clock.now

    yield* logMessageEffect(`done (${formatElapsedSeconds(end - start)})`)

    return result
  })
}
