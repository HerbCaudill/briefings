import { basename } from "node:path"
import { VAULT_PATH } from "./constants.ts"
import { listGoogleItems } from "./listGoogleItems.ts"
import { runGoogleTasks } from "./runGoogleTasks.ts"
import type { GoogleTask, GwsRunner } from "./types.ts"

/** Link verified research and publish its execution steps without duplicating completed children on retry. */
export async function publishResearch(
  /** Fresh parent task, including its current list. */
  task: GoogleTask & { listId: string },
  /** Verified vault-relative Markdown note, or empty if saving was blocked. */
  notePath: string,
  /** Concrete steps in execution order. */
  nextSteps: string[],
  /** Google Tasks API boundary. */
  run: GwsRunner = runGoogleTasks,
): Promise<void> {
  const params = { tasklist: task.listId, task: task.id }
  const link = notePath
    ? `obsidian://open?vault=${encodeURIComponent(basename(VAULT_PATH))}&file=${encodeURIComponent(notePath.replace(/\.md$/, ""))}`
    : ""
  const originalNotes = task.notes ?? ""
  const notes = [originalNotes, link && !originalNotes.includes(link) ? `Research: ${link}` : ""]
    .filter(Boolean)
    .join("\n")
  if (notes !== originalNotes) {
    await run(["tasks", "tasks", "patch"], { params, body: { notes } })
    const verified = (await run(["tasks", "tasks", "get"], { params })) as GoogleTask
    if (verified.notes !== notes) throw new Error("Research task-note verification failed")
  }
  if (!nextSteps.length) return
  if (task.parent)
    throw new Error("Google Tasks cannot nest research steps under an existing subtask")
  const children = (
    await listGoogleItems<GoogleTask>(run, ["tasks", "tasks", "list"], {
      tasklist: task.listId,
      showCompleted: true,
      showHidden: true,
    })
  )
    .filter(child => !child.deleted && child.parent === task.id)
    .sort((a, b) => (a.position ?? "").localeCompare(b.position ?? ""))
  // Preserve user-created children and their order; append only missing research steps.
  let previous = children.at(-1)?.id
  for (const title of [...new Set(nextSteps)]) {
    if (children.some(child => child.title === title)) continue
    const inserted = (await run(["tasks", "tasks", "insert"], {
      params: { tasklist: task.listId, parent: task.id, ...(previous ? { previous } : {}) },
      body: { title },
    })) as GoogleTask
    if (!inserted.id) throw new Error("Research subtask insertion returned no identifier")
    const verified = (await run(["tasks", "tasks", "get"], {
      params: { tasklist: task.listId, task: inserted.id },
    })) as GoogleTask
    if (verified.parent !== task.id || verified.title !== title || verified.deleted)
      throw new Error("Research subtask verification failed")
    previous = verified.id
  }
}
