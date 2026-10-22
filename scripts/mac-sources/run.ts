import { execFile } from "node:child_process"
import { mkdirSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"
import { importReminders } from "../inbox/importReminders.ts"
import { writeTextAtomically } from "../morning-briefing/atomicWrite.ts"
import { readAppleMessages } from "../morning-briefing/readAppleMessages.ts"
import { acquireMorningBriefingRunLock } from "../morning-briefing/runLock.ts"

if (process.platform !== "darwin") throw new Error("The Mac source exporter must run on macOS")
const root = join(homedir(), ".local/state/morning-briefing/mac-sources")
mkdirSync(root, { recursive: true, mode: 0o700 })
const release = acquireMorningBriefingRunLock(join(root, "export.lock"))
try {
  const now = new Date()
  const source = readAppleMessages({
    since: new Date(now.getTime() - 3 * 86_400_000),
    timeZone: "Europe/Madrid",
  })
  const path = join(root, "apple-messages.json")
  writeTextAtomically(
    path,
    JSON.stringify({ version: 1, exportedAt: now.toISOString(), source }) + "\n",
  )
  const operations = [
    promisify(execFile)("scp", [
      "-q",
      path,
      "mini:C:/Users/herb/.local/state/morning-briefing/mac-sources/apple-messages.json",
    ]).then(() => console.log(`Apple Messages export delivered (${source.status})`)),
  ]
  if (!process.argv.includes("--export-only"))
    operations.push(importReminders().then(count => console.log(`Reminders transferred: ${count}`)))
  const outcomes = await Promise.allSettled(operations)
  if (outcomes.some(outcome => outcome.status === "rejected"))
    throw new Error(
      "One or more Mac source operations failed; retained artifacts and reminders remain recoverable",
    )
} finally {
  release()
}
