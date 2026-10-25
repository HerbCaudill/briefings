import { existsSync, mkdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { setTimeout } from "node:timers/promises"
import { formatLocalDate } from "../morning-briefing/date.ts"
import { acquireMorningBriefingRunLock } from "../morning-briefing/runLock.ts"
import { INBOX_STATE_PATH, VAULT_PATH } from "./constants.ts"
import { importReminders } from "./importReminders.ts"
import { createTasksClient } from "../tasks/createTasksClient.ts"
import { targetFromRecord } from "../tasks/targetFromRecord.ts"
import { migrateCaptureRecord } from "../tasks/migrateCaptureRecord.ts"
import { parseCaptures } from "./parseCaptures.ts"
import { processInbox } from "./processInbox.ts"
import { transferCapture } from "./transferCapture.ts"
import { classifyCapture } from "./classifyCapture.ts"
import { processXBookmarks } from "./processXBookmarks.ts"
import type { CaptureProcessor } from "./types.ts"

/** Process reminders and captures under one shared lock, including the pre-briefing pass. */
export async function runInboxIntake(): Promise<number> {
  mkdirSync(INBOX_STATE_PATH, { recursive: true, mode: 0o700 })
  let release: (() => void) | undefined
  while (!release) {
    try {
      release = acquireMorningBriefingRunLock(join(INBOX_STATE_PATH, "intake.lock"))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
      await setTimeout(1_000)
    }
  }
  try {
    const failures: unknown[] = []
    let processed = 0
    const sources = [
      () => (process.platform === "win32" ? Promise.resolve(0) : importReminders()),
      processCaptures,
      () =>
        process.platform === "win32"
          ? processXBookmarks({
              ...captureProcessor(),
              statePath: INBOX_STATE_PATH,
              jsonPath: join(VAULT_PATH, "documents/x-bookmarks/bookmarks.json"),
              markdownPath: join(VAULT_PATH, "documents/X bookmarks.md"),
            })
          : Promise.resolve(0),
    ]
    for (const source of sources) {
      try {
        processed += await source()
      } catch (error) {
        failures.push(error)
      }
    }
    if (failures.length) throw new Error(failures.map(String).join("\n"))
    return processed
  } finally {
    release()
  }
}

/** Transfer Siri captures from the Obsidian inbox. */
async function processCaptures(): Promise<number> {
  const inboxPath = join(VAULT_PATH, "inbox.md")
  if (!existsSync(inboxPath) || !parseCaptures(readFileSync(inboxPath, "utf8")).length) return 0
  return await processInbox({
    ...captureProcessor(),
    inboxPath,
    archivePath: join(VAULT_PATH, "documents/inbox.archive.md"),
  })
}

/** Shared classifier, identity recovery, and Tasks write boundary. */
function captureProcessor(): CaptureProcessor {
  const date = formatLocalDate(new Date(), "Europe/Madrid")
  return {
    statePath: join(INBOX_STATE_PATH, "captures"),
    date,
    prepareRecord: async record => {
      const client = createTasksClient()
      const migrated = await migrateCaptureRecord(record, client)
      if (migrated.target)
        migrated.target = targetFromRecord(
          await client.get(migrated.target.kind, migrated.target.id),
          client.spaceId,
        )
      return migrated
    },
    transfer: (capture, draft, recovery) => transferCapture({ capture, draft, ...recovery }),
    classify: capture => classifyCapture(capture, date),
  }
}
