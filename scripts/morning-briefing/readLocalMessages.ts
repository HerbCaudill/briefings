import { readAppleMessages } from "./readAppleMessages.ts"
import { readSignalMessages } from "./readSignalMessages.ts"
import type { LocalMessagesSource } from "./types.ts"

/** Read recent Signal and Apple Messages conversations from their local databases. */
export async function readLocalMessages(
  /** Time window for both sources. */
  args: {
    /** Earliest message to include. */
    since: Date
    /** Time zone for transcript timestamps. */
    timeZone: string
  },
): Promise<LocalMessagesSource[]> {
  return [await readSignalMessages(args), readAppleMessages(args)]
}
