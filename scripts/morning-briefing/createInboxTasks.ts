import { execFile } from "node:child_process"
import { promisify } from "node:util"

import type { CreatedMorningBriefingTask, MorningBriefingTaskDraft } from "./types.ts"

const execFileAsync = promisify(execFile)

/** Create new briefing actions in Inbox after an exact live duplicate check. */
export async function createInboxTasks(
  /** Proposed actions and optional command runner override. */
  args: CreateInboxTasksArgs,
): Promise<CreatedMorningBriefingTask[]> {
  if (!args.tasks.length) return []

  const run = args.runCommand ?? runGwsDelegated
  const taskLists = await listAll<TaskList>(run, ["tasks", "tasklists", "list"], {})
  const inboxes = taskLists.filter(taskList => taskList.title.trim().toLowerCase() === "inbox")
  if (inboxes.length !== 1)
    throw new Error(`Expected one Google Tasks list named Inbox; found ${inboxes.length}`)

  const existingTasks = (
    await Promise.all(
      taskLists.map(taskList =>
        listAll<GoogleTask>(run, ["tasks", "tasks", "list"], {
          showCompleted: true,
          showHidden: true,
          tasklist: taskList.id,
        }),
      ),
    )
  ).flat()
  const existingTitles = new Set(existingTasks.map(task => normalizeTitle(task.title)))
  const uniqueDrafts = args.tasks.filter(task => {
    const title = normalizeTitle(task.title)
    if (!title || existingTitles.has(title)) return false
    existingTitles.add(title)
    return true
  })

  const createdTasks: CreatedMorningBriefingTask[] = []
  for (const task of uniqueDrafts) {
    const created = (await run(["tasks", "tasks", "insert"], {
      body: { notes: task.notes, title: task.title.trim() },
      params: { tasklist: inboxes[0]!.id },
    })) as GoogleTask
    createdTasks.push({
      ...task,
      title: created.title,
      url: `https://tasks.google.com/task/${encodeURIComponent(created.id)}?sa=6`,
    })
  }
  return createdTasks
}

/** Read every page from one Google Workspace list endpoint. */
async function listAll<Item>(
  run: GwsCommandRunner,
  command: readonly string[],
  params: Record<string, boolean | number | string>,
): Promise<Item[]> {
  const items: Item[] = []
  let pageToken: string | undefined
  do {
    const page = (await run(command, {
      params: { ...params, maxResults: 100, ...(pageToken ? { pageToken } : {}) },
    })) as ListResponse<Item>
    items.push(...(page.items ?? []))
    pageToken = page.nextPageToken
  } while (pageToken)
  return items
}

/** Run one delegated Google Workspace API command and parse its JSON response. */
async function runGwsDelegated(command: readonly string[], request: GwsRequest): Promise<unknown> {
  const args = [...command]
  if (request.params) args.push("--params", JSON.stringify(request.params))
  if (request.body) args.push("--json", JSON.stringify(request.body))
  const { stdout } = await execFileAsync("gws-delegated", args, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  })
  return JSON.parse(stdout) as unknown
}

/** Normalize a title for conservative exact duplicate detection. */
function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US")
}

type CreateInboxTasksArgs = {
  /** Optional injected API command runner. */
  runCommand?: GwsCommandRunner
  /** Actions selected by synthesis. */
  tasks: readonly MorningBriefingTaskDraft[]
}

type GoogleTask = {
  id: string
  title: string
}

type GwsCommandRunner = (command: readonly string[], request: GwsRequest) => Promise<unknown>

type GwsRequest = {
  body?: Record<string, string>
  params?: Record<string, boolean | number | string>
}

type ListResponse<Item> = {
  items?: Item[]
  nextPageToken?: string
}

type TaskList = {
  id: string
  title: string
}
