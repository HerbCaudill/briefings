import { listGoogleItems } from "./listGoogleItems.ts"
import { runGoogleTasks } from "./runGoogleTasks.ts"
import type { GoogleTask, GwsRunner } from "./types.ts"

/** Load current task locations, including completed tasks for capture-marker recovery. */
export async function loadGoogleTasks(
  /** API boundary. */
  run: GwsRunner = runGoogleTasks,
  /** Only recovery needs completed history, beginning when the capture was made. */
  completedSince?: string,
) {
  const lists = await listGoogleItems<{ id: string; title: string }>(run, [
    "tasks",
    "tasklists",
    "list",
  ])
  const tasks = (
    await Promise.all(
      lists.map(async list => {
        const open = await listGoogleItems<GoogleTask>(run, ["tasks", "tasks", "list"], {
          tasklist: list.id,
          showCompleted: false,
          showAssigned: true,
        })
        const completed = completedSince
          ? await listGoogleItems<GoogleTask>(run, ["tasks", "tasks", "list"], {
              tasklist: list.id,
              showCompleted: true,
              showHidden: true,
              showAssigned: true,
              completedMin: completedSince,
            })
          : []
        return [...open, ...completed.filter(task => task.status === "completed")].map(task => ({
          ...task,
          listId: list.id,
        }))
      }),
    )
  ).flat()
  return { lists, tasks }
}
