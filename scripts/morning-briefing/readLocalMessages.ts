import { readAppleMessages } from "./readAppleMessages.ts"
import { readSignalMessages } from "./readSignalMessages.ts"
import { readMacMessagesArtifact } from "./readMacMessagesArtifact.ts"
import { MORNING_BRIEFING_STATE_DIRECTORY_PATH } from "./constants.ts"
import { join } from "node:path"
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
  return [
    await readSignalMessages(args),
    process.platform === "win32"
      ? readMacMessagesArtifact(
          join(MORNING_BRIEFING_STATE_DIRECTORY_PATH, "mac-sources/apple-messages.json"),
        )
      : readAppleMessages(args),
  ]
}
