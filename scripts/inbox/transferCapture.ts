import { loadGoogleTasks } from "./loadGoogleTasks.ts"
import { runGoogleTasks } from "./runGoogleTasks.ts"
import type { GoogleTask, GwsRunner } from "./types.ts"
import type { Capture, CaptureDraft, CaptureTarget } from "./types.ts"

/** Recover or create a task, then verify the original capture's durable backlink. */
export async function transferCapture(args: {
  /** Original dictation. */
  capture: Capture
  /** Read-only classification. */
  draft: CaptureDraft
  /** Optional API override. */
  run?: GwsRunner
}): Promise<CaptureTarget> {
  const run = args.run ?? runGoogleTasks
  const { lists, tasks } = await loadGoogleTasks(run, args.capture.timestamp)
  const inboxes = lists.filter(list => list.title.toLowerCase() === "inbox")
  if (inboxes.length !== 1) throw new Error(`Expected one Inbox list; found ${inboxes.length}`)
  const marker = `capture-${args.capture.id}`
  const recovered = tasks.find(task => !task.deleted && task.notes?.includes(marker))
  const duplicate = tasks.find(
    task =>
      !task.deleted &&
      task.status !== "completed" &&
      ((task.id === args.draft.duplicate?.id && task.listId === args.draft.duplicate?.listId) ||
        normalize(task.title) === normalize(args.draft.title)),
  )
  const existing = recovered ?? duplicate
  const listId = existing?.listId ?? inboxes[0]!.id
  const source = `Captured: ${args.capture.timestamp}\nSource: obsidian://open?vault=notes&file=${encodeURIComponent(`Inbox archive#^${marker}`)}`
  const operational = [
    args.draft.question ? `Question: ${args.draft.question}` : "",
    args.draft.research
      ? "Research: queued; findings will be linked here for the morning review."
      : "",
    source,
  ]
    .filter(Boolean)
    .join("\n")
  let id = existing?.id
  let expectedNotes: string | undefined
  if (!existing) {
    expectedNotes = operational
    const inserted = (await run(["tasks", "tasks", "insert"], {
      params: { tasklist: listId },
      body: { title: args.draft.title, notes: expectedNotes },
    })) as GoogleTask
    id = inserted.id
  } else if (!recovered) {
    const fresh = (await run(["tasks", "tasks", "get"], {
      params: { tasklist: listId, task: id! },
    })) as GoogleTask
    expectedNotes = [fresh.notes, operational].filter(Boolean).join("\n\n")
    await run(["tasks", "tasks", "patch"], {
      params: { tasklist: listId, task: id! },
      body: { notes: expectedNotes },
    })
  }
  if (!id) throw new Error("Google Tasks returned no task ID")
  const verified = (await run(["tasks", "tasks", "get"], {
    params: { tasklist: listId, task: id },
  })) as GoogleTask
  if (
    verified?.id !== id ||
    verified.deleted ||
    !verified.notes?.includes(marker) ||
    (expectedNotes && verified.notes !== expectedNotes)
  )
    throw new Error("Capture task verification failed")
  return {
    id,
    listId,
    title: verified.title,
    url: verified.webViewLink ?? `https://tasks.google.com/task/${encodeURIComponent(id)}?sa=6`,
  }
}

/** Conservative comparison of task titles. */
function normalize(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase()
}
