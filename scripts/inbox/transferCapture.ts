import { loadGoogleTasks } from "./loadGoogleTasks.ts"
import { runGoogleTasks } from "./runGoogleTasks.ts"
import type { Capture, CaptureDraft, CaptureTarget, GoogleTask, GwsRunner } from "./types.ts"

/** Recover or create a task and verify it, keeping capture metadata in the private journal. */
export async function transferCapture(args: {
  /** Original dictation. */
  capture: Capture
  /** Read-only classification. */
  draft: CaptureDraft
  /** Previously returned destination awaiting verification. */
  candidate?: CaptureTarget
  /** Whether an insertion may already have reached Google. */
  insertionAttempted?: boolean
  /** Persist intent before calling Google; persist its response before verification. */
  checkpoint?: (candidate?: CaptureTarget) => void
  /** Optional API override. */
  run?: GwsRunner
}): Promise<CaptureTarget> {
  const run = args.run ?? runGoogleTasks
  const { lists, tasks } = await loadGoogleTasks(run, args.capture.timestamp)
  const inboxes = lists.filter(list => list.title.toLowerCase() === "inbox")
  if (inboxes.length !== 1) throw new Error(`Expected one Inbox list; found ${inboxes.length}`)
  const recovered =
    args.candidate && tasks.find(task => !task.deleted && task.id === args.candidate!.id)
  const duplicate = tasks.find(
    task =>
      !task.deleted &&
      task.status !== "completed" &&
      ((task.id === args.draft.duplicate?.id && task.listId === args.draft.duplicate?.listId) ||
        normalize(task.title) === normalize(args.draft.title)),
  )
  const existing = recovered || duplicate
  const listId = existing?.listId ?? args.candidate?.listId ?? inboxes[0]!.id
  let id = existing?.id ?? args.candidate?.id
  if (!id) {
    if (args.insertionAttempted)
      throw new Error(
        "Previous task insertion has an uncertain outcome; reconcile it before retrying",
      )
    args.checkpoint?.()
    const inserted = (await run(["tasks", "tasks", "insert"], {
      params: { tasklist: listId },
      body: { title: args.draft.title },
    })) as GoogleTask
    id = inserted.id
    if (id)
      args.checkpoint?.({
        id,
        listId,
        title: inserted.title,
        url: inserted.webViewLink ?? `https://tasks.google.com/task/${encodeURIComponent(id)}?sa=6`,
      })
  }
  if (!id) throw new Error("Google Tasks returned no task ID")
  const verified = (await run(["tasks", "tasks", "get"], {
    params: { tasklist: listId, task: id },
  })) as GoogleTask
  if (verified?.id !== id || verified.deleted) throw new Error("Capture task verification failed")
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
