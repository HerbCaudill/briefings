import { createTasksClient } from "../tasks/createTasksClient.ts"
import { targetFromRecord } from "../tasks/targetFromRecord.ts"
import type { TasksClient } from "../tasks/types.ts"
import type { Capture, CaptureDraft, CaptureTarget } from "./types.ts"

/** Recover the original capture identity and verify the current destination before archiving. */
export async function transferCapture(args: {
  /** Original immutable capture. */
  capture: Capture
  /** Persisted classification. */
  draft: CaptureDraft
  /** Previously acknowledged target. */
  candidate?: CaptureTarget
  /** Whether the original request may have been dispatched. */
  insertionAttempted?: boolean
  /** Save intent and identity before another phase. */
  checkpoint?: (candidate?: CaptureTarget) => void
  /** Injectable board client. */
  client?: TasksClient
}): Promise<CaptureTarget> {
  const client = args.client ?? createTasksClient()
  if (args.candidate) {
    if (args.candidate.spaceId !== client.spaceId) throw new Error("Capture space mismatch")
    return targetFromRecord(
      await client.get(args.candidate.kind, args.candidate.id),
      client.spaceId,
    )
  }
  if (!args.insertionAttempted) {
    const duplicate = args.draft.duplicate
    if (duplicate) {
      const record = await client.get(duplicate.kind, duplicate.id)
      if (record.status === "done")
        throw new Error("Classified duplicate is already complete; review capture")
      return targetFromRecord(record, client.spaceId)
    }
    const matching = (await client.list("task")).filter(
      task =>
        task.status !== "done" &&
        task.title.trim().replace(/\s+/g, " ").toLowerCase() ===
          args.draft.title.trim().replace(/\s+/g, " ").toLowerCase(),
    )
    if (matching.length > 1) throw new Error("Ambiguous capture title; review duplicates")
    if (matching.length === 1) return targetFromRecord(matching[0]!, client.spaceId)
  }
  const eventKey = `siri:${args.capture.id}`
  args.checkpoint?.()
  const result = await client.write("capture", { title: args.draft.title, eventKey }, eventKey)
  const created = result.records?.find(
    record =>
      record.kind === "task" &&
      record.creationKey === `capture:${eventKey}` &&
      result.createdIds?.includes(record.id),
  )
  if (!created) throw new Error("Capture identity was not established")
  args.checkpoint?.(targetFromRecord(created, client.spaceId))
  return targetFromRecord(await client.get("task", created.id), client.spaceId)
}
