import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { writeTextAtomically } from "../morning-briefing/atomicWrite.ts"
import type { Capture, CaptureProcessor, CaptureRecord } from "./types.ts"

/** Classify once and checkpoint transfer intent before every remote write. */
export async function processCapture(
  capture: Capture,
  args: CaptureProcessor,
): Promise<CaptureRecord> {
  const recordPath = join(args.statePath, `${capture.id}.json`)
  let record: CaptureRecord = existsSync(recordPath)
    ? (JSON.parse(readFileSync(recordPath, "utf8")) as CaptureRecord)
    : { version: 2, capture, date: args.date, draft: await args.classify(capture) }
  if (args.prepareRecord) record = await args.prepareRecord(record)
  writeTextAtomically(recordPath, JSON.stringify(record, null, 2))
  if (!record.target && (!record.draft.disposition || record.draft.disposition === "task")) {
    record.target = await args.transfer(record.capture, record.draft, {
      candidate: record.candidate,
      insertionAttempted: record.insertionAttempted,
      checkpoint: candidate => {
        record.insertionAttempted = true
        if (candidate) record.candidate = candidate
        writeTextAtomically(recordPath, JSON.stringify(record, null, 2))
      },
    })
    writeTextAtomically(recordPath, JSON.stringify(record, null, 2))
  }
  return record
}
