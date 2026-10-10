import { execFile } from "node:child_process"
import { createHash } from "node:crypto"
import { join } from "node:path"
import { promisify } from "node:util"
import { createTasksClient } from "../tasks/createTasksClient.ts"
import type { TasksClient } from "../tasks/types.ts"

/** Apple Reminders list that Siri captures land in. */
const REMINDERS_LIST = "Reminders"

/** Move open reminders to the Tasks inbox, marking each done only after its task is verified. */
export async function importReminders(
  args: {
    /** Injectable Reminders boundary. */
    reminders?: ReminderSource
    /** Injectable board client. */
    client?: TasksClient
  } = {},
): Promise<number> {
  const reminders = args.reminders ?? appleReminders
  const open = await reminders.list()
  if (!open.length) return 0
  const client = args.client ?? createTasksClient()
  const failures: unknown[] = []
  let imported = 0
  for (const reminder of open) {
    try {
      // Hash the title so an edited reminder never replays a request ID with changed input.
      const hash = createHash("sha256").update(reminder.title).digest("hex").slice(0, 12)
      const eventKey = `reminder:${reminder.id}:${hash}`
      const result = await client.write("capture", { title: reminder.title, eventKey }, eventKey)
      const created = result.records?.find(
        record =>
          record.kind === "task" &&
          record.creationKey === `capture:${eventKey}` &&
          result.createdIds?.includes(record.id),
      )
      if (!created) throw new Error(`Reminder "${reminder.title}" was not captured`)
      await client.get("task", created.id)
      await reminders.complete(reminder.id)
      imported++
    } catch (error) {
      failures.push(error)
    }
  }
  if (failures.length) throw new Error(failures.map(error => String(error)).join("\n"))
  return imported
}

/** Read and complete reminders through the EventKit helper. */
const appleReminders: ReminderSource = {
  async list() {
    const output = await runHelper("list", REMINDERS_LIST)
    return (JSON.parse(output) as { id: string; name: string; body: string }[])
      .map(({ id, name, body }) => ({
        id,
        title: [name, body]
          .map(part => part.trim().replace(/\s+/g, " "))
          .filter(Boolean)
          .join(" – "),
      }))
      .filter(reminder => reminder.title)
  },
  async complete(id) {
    await runHelper("complete", id)
  },
}

/** Run the Swift EventKit helper and return its output. */
async function runHelper(...args: string[]): Promise<string> {
  const { stdout } = await promisify(execFile)(
    "swift",
    [join(import.meta.dirname, "reminders.swift"), ...args],
    { timeout: 120_000 },
  )
  return stdout.trim()
}

/** Open reminder to move into Tasks. */
type Reminder = {
  /** Reminders identifier. */
  id: string
  /** Task title, including any notes. */
  title: string
}

/** Reminders boundary. */
type ReminderSource = {
  /** Open reminders in the capture list. */
  list: () => Promise<Reminder[]>
  /** Mark a reminder done. */
  complete: (id: string) => Promise<void>
}
