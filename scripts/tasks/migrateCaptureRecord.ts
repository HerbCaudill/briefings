import type { CaptureRecord } from "../inbox/types.ts"
import { createTasksClient } from "./createTasksClient.ts"
import { targetFromRecord } from "./targetFromRecord.ts"

/** Convert a legacy journal only through exact import provenance; preserve its original evidence. */
export async function migrateCaptureRecord(
  value: unknown,
  client = createTasksClient(),
): Promise<CaptureRecord> {
  const record = value as CaptureRecord
  if (!record?.capture?.id || !record.draft?.title || !record.date)
    throw new Error("Invalid capture journal")
  if (record.version === 2) {
    for (const target of [record.target, record.candidate])
      if (target && target.spaceId !== client.spaceId)
        throw new Error("Capture journal space mismatch")
    return record
  }
  if (record.insertionAttempted && !record.target && !record.candidate)
    throw new Error("Legacy insertion has an uncertain outcome; reconcile before conversion")
  const converted = { ...record, version: 2 as const, legacy: value }
  for (const field of ["target", "candidate"] as const) {
    const old = record[field]
    if (old)
      converted[field] = targetFromRecord(
        await client.resolve(`google-tasks:${old.id}`),
        client.spaceId,
      )
  }
  if (record.draft.duplicate) {
    const target = await client.resolve(`google-tasks:${record.draft.duplicate.id}`)
    if (target.kind !== "task" && target.kind !== "project")
      throw new Error("Invalid legacy duplicate mapping")
    converted.draft = { ...record.draft, duplicate: { kind: target.kind, id: target.id } }
  }
  return converted
}
