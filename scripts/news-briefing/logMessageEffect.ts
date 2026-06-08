import { Effect } from "effect"
import { LoggingService } from "./runtimeServices.ts"

/** Write a message through the Effect logging service. */
export function logMessageEffect(
  /** The message to write. */
  message: string,
): Effect.Effect<void, never, LoggingService> {
  return Effect.gen(function* () {
    const logging = yield* LoggingService

    yield* logging.log(message)
  })
}
