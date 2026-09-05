import { existsSync, mkdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { setTimeout } from "node:timers/promises"
import { writeTextAtomically } from "../morning-briefing/atomicWrite.ts"
import { runCodexAgent } from "../morning-briefing/codexAgent.ts"
import {
  BRIEFINGS_REPOSITORY_PATH,
  CODEX_COMMAND_PATH,
  MORNING_BRIEFING_MODEL,
} from "../morning-briefing/constants.ts"
import { formatLocalDate } from "../morning-briefing/date.ts"
import { acquireMorningBriefingRunLock } from "../morning-briefing/runLock.ts"
import { INBOX_STATE_PATH, VAULT_PATH } from "./constants.ts"
import { loadGoogleTasks } from "./loadGoogleTasks.ts"
import { parseCaptures } from "./parseCaptures.ts"
import { processInbox } from "./processInbox.ts"
import { transferCapture } from "./transferCapture.ts"
import type { CaptureDraft } from "./types.ts"

/** Process captures under one shared lock, including the pre-briefing pass. */
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
    const inboxPath = join(VAULT_PATH, "inbox.md")
    if (!existsSync(inboxPath) || !parseCaptures(readFileSync(inboxPath, "utf8")).length) return 0
    const date = formatLocalDate(new Date(), "Europe/Madrid")
    const snapshotPath = join(INBOX_STATE_PATH, "tasks.json")
    return await processInbox({
      inboxPath,
      archivePath: join(VAULT_PATH, "Inbox archive.md"),
      statePath: join(INBOX_STATE_PATH, "captures"),
      date,
      transfer: (capture, draft) => transferCapture({ capture, draft }),
      classify: async capture => {
        writeTextAtomically(snapshotPath, JSON.stringify(await loadGoogleTasks()))
        const outputPath = join(INBOX_STATE_PATH, "agents", `${capture.id}.classification.json`)
        await runCodexAgent({
          codexCommand: CODEX_COMMAND_PATH,
          cwd: BRIEFINGS_REPOSITORY_PATH,
          environment: process.env,
          eventsPath: `${outputPath}.events.jsonl`,
          model: MORNING_BRIEFING_MODEL,
          outputPath,
          schemaPath: join(import.meta.dirname, "schemas/classification.schema.json"),
          sandbox: "read-only",
          threadSource: "inbox-classification",
          prompt: `${readFileSync(join(import.meta.dirname, "prompts/classify.prompt.md"), "utf8")}\n\nRun context:\n${JSON.stringify({ capture, date, snapshotPath })}`,
        })
        const draft = JSON.parse(readFileSync(outputPath, "utf8")) as CaptureDraft
        if (
          !draft.title?.trim() ||
          typeof draft.question !== "string" ||
          typeof draft.research !== "string" ||
          (draft.duplicate !== null && (!draft.duplicate?.id || !draft.duplicate?.listId))
        )
          throw new Error("Invalid capture classification")
        return draft
      },
    })
  } finally {
    release()
  }
}
