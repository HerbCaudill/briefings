import { existsSync, mkdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { writeTextAtomically } from "../morning-briefing/atomicWrite.ts"
import { parseCaptures } from "./parseCaptures.ts"
import { processCapture } from "./processCapture.ts"
import type { CaptureProcessor, CaptureRecord } from "./types.ts"

/** Transfer a snapshot of captures, keeping the source until each destination is verified. */
export async function processInbox(args: ProcessInboxArgs): Promise<number> {
  if (!existsSync(args.inboxPath)) return 0
  mkdirSync(args.statePath, { recursive: true, mode: 0o700 })
  const captures = parseCaptures(readFileSync(args.inboxPath, "utf8"))
  const failures: unknown[] = []
  let processed = 0
  for (const capture of captures) {
    try {
      const record = await processCapture(capture, args)
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
    const followUp = record.draft.question
      ? `Follow-up for review: ${record.draft.question}\n\n`
      : ""
    const entry = `${record.capture.raw}\n\n${followUp}[Task](${record.target!.url}) ${marker}\n\n`
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

type ProcessInboxArgs = CaptureProcessor & {
  /** Capture file updated by Siri and Obsidian Sync. */
  inboxPath: string
  /** Single archive note. */
  archivePath: string
}
