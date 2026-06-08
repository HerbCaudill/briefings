import { Effect } from "effect"
import { LoggingService } from "./runtimeServices.ts"

/** Write a blank line through the Effect logging service. */
export function logBlankLineEffect(): Effect.Effect<void, never, LoggingService> {
  return Effect.gen(function* () {
    const logging = yield* LoggingService

    yield* logging.log("")
  })
}
