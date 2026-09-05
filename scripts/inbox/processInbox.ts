import { existsSync, mkdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { writeTextAtomically } from "../morning-briefing/atomicWrite.ts"
import { parseCaptures } from "./parseCaptures.ts"
import type { Capture, CaptureDraft, CaptureRecord, CaptureTarget } from "./types.ts"

/** Transfer a snapshot of captures, keeping the source until each destination is verified. */
export async function processInbox(args: ProcessInboxArgs): Promise<number> {
  if (!existsSync(args.inboxPath)) return 0
  mkdirSync(args.statePath, { recursive: true, mode: 0o700 })
  const captures = parseCaptures(readFileSync(args.inboxPath, "utf8"))
  const failures: unknown[] = []
  let processed = 0
  for (const capture of captures) {
    try {
      const recordPath = join(args.statePath, `${capture.id}.json`)
      const record: CaptureRecord = existsSync(recordPath)
        ? (JSON.parse(readFileSync(recordPath, "utf8")) as CaptureRecord)
        : { capture, date: args.date, draft: await args.classify(capture) }
      writeTextAtomically(recordPath, JSON.stringify(record, null, 2))
      if (!record.target) {
        record.target = await args.transfer(capture, record.draft)
        writeTextAtomically(recordPath, JSON.stringify(record, null, 2))
      }
      archiveCapture(args, record)
      processed++
    } catch (error) {
      failures.push(error)
    }
  }
  if (failures.length) throw new Error(failures.map(error => String(error)).join("\n"))
  return processed
}

/** Archive once, then remove only the unchanged capture from a freshly read inbox. */
function archiveCapture(args: ProcessInboxArgs, record: CaptureRecord): void {
  const marker = `^capture-${record.capture.id}`
  const archive = existsSync(args.archivePath) ? readFileSync(args.archivePath, "utf8") : ""
  if (!archive.includes(marker)) {
    const heading = `## ${record.date}`
    const entry = `${record.capture.raw}\n\n[Google Task](${record.target!.url}) ${marker}\n\n`
    const headingIndex = archive.indexOf(`${heading}\n`)
    const next =
      headingIndex === -1
        ? `${archive.trimEnd()}\n\n${heading}\n\n${entry}`.trimStart()
        : `${archive.slice(0, headingIndex + heading.length + 1)}\n${entry}${archive.slice(headingIndex + heading.length + 1).trimStart()}`
    if (existsSync(args.archivePath) && readFileSync(args.archivePath, "utf8") !== archive)
      throw new Error("Archive changed during transfer; leaving capture for retry")
    writeTextAtomically(args.archivePath, next)
  }
  if (!readFileSync(args.archivePath, "utf8").includes(marker))
    throw new Error("Archive verification failed")

  const latest = readFileSync(args.inboxPath, "utf8")
  const unchanged = parseCaptures(latest).find(capture => capture.id === record.capture.id)
  if (!unchanged) return
  const offset = latest.indexOf(unchanged.raw)
  const suffix = latest.slice(offset + unchanged.raw.length).replace(/^\r?\n/, "")
  const remaining = latest.slice(0, offset) + suffix
  // Keep a recovery copy before the brief synchronous read/check/replace operation.
  writeTextAtomically(join(args.statePath, `${record.capture.id}.inbox-backup.md`), latest)
  if (readFileSync(args.inboxPath, "utf8") !== latest)
    throw new Error("Inbox changed during transfer; leaving capture for retry")
  writeTextAtomically(args.inboxPath, remaining)
}

type ProcessInboxArgs = {
  /** Capture file updated by Siri and Obsidian Sync. */
  inboxPath: string
  /** Single archive note. */
  archivePath: string
  /** Private transfer journal directory. */
  statePath: string
  /** Processing date in the local time zone. */
  date: string
  /** Read-only classifier. */
  classify: (capture: Capture) => Promise<CaptureDraft>
  /** Idempotent task creation with read-back verification. */
  transfer: (capture: Capture, draft: CaptureDraft) => Promise<CaptureTarget>
}
