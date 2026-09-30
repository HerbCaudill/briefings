import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { createTasksClient } from "../tasks/createTasksClient.ts"
import { saveDescription } from "../tasks/saveDescription.ts"
import type { BoardRecord, TasksClient } from "../tasks/types.ts"
import { writeTextAtomically } from "./atomicWrite.ts"
import type { CreatedMorningBriefingTask, MorningBriefingTaskDraft } from "./types.ts"

/** Capture deduplicated briefing actions with durable intentions for every publication phase. */
export async function createInboxTasks(args: {
  /** Proposed actions from synthesis. */
  tasks: readonly MorningBriefingTaskDraft[]
  /** Stable local briefing date, also retained on reruns. */
  date?: string
  /** Optional isolated client. */
  client?: TasksClient
  /** Optional private test directory. */
  statePath?: string
}): Promise<CreatedMorningBriefingTask[]> {
  if (!args.tasks.length) return []
  const client = args.client ?? createTasksClient()
  const statePath = args.statePath ?? join(homedir(), ".local/state/briefings-tasks/captures")
  if (!args.date) throw new Error("Briefing date is required for stable capture identity")
  const existing = [...(await client.list("task")), ...(await client.list("project"))]
  const titles = new Set(existing.map(task => normalizeTitle(task.title)))
  const seen = new Set<string>()
  const created: CreatedMorningBriefingTask[] = []
  for (const draft of args.tasks) {
    const title = normalizeTitle(draft.title)
    if (!title || seen.has(title)) continue
    seen.add(title)
    const eventKey = `briefing:${args.date}:${createHash("sha256").update(title).digest("hex")}`
    const path = join(statePath, `${eventKey}.json`)
    if (!existsSync(path) && titles.has(title)) continue
    const intent: {
      spaceId: string
      draft: MorningBriefingTaskDraft
      record?: BoardRecord
      saved: boolean
    } = existsSync(path)
      ? JSON.parse(readFileSync(path, "utf8"))
      : { spaceId: client.spaceId, draft: { ...draft, title: draft.title.trim() }, saved: false }
    if (intent.spaceId !== client.spaceId) throw new Error("Briefing capture space mismatch")
    writeTextAtomically(path, JSON.stringify(intent))
    if (!intent.record) {
      const result = await client.write(
        "capture",
        { title: intent.draft.title, eventKey },
        eventKey,
      )
      intent.record = result.records?.find(
        record =>
          record.creationKey === `capture:${eventKey}` && result.createdIds?.includes(record.id),
      )
      if (!intent.record) throw new Error("Briefing capture identity was not established")
      writeTextAtomically(path, JSON.stringify(intent))
    }
    if (!intent.saved && intent.draft.notes)
      await saveDescription(
        {
          record: intent.record,
          text: intent.draft.notes,
          eventKey,
          statePath: join(statePath, "descriptions"),
        },
        client,
      )
    const current = await client.get("task", intent.record.id)
    intent.saved = true
    writeTextAtomically(path, JSON.stringify(intent))
    created.push({ ...intent.draft, title: current.title, url: current.url })
    titles.add(title)
  }
  return created
}

/** Conservative exact-title comparison across open and completed records. */
function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US")
}
