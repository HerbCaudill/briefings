import { expect, test } from "vitest"
import type { GoogleTask, GwsRequest } from "../types.ts"
import { transferCapture } from "../transferCapture.ts"

test("recovers a task after a lost insert response without duplicating the task", async () => {
  const tasks: GoogleTask[] = []
  let inserts = 0
  const run = async (command: readonly string[], request: GwsRequest) => {
    if (command[1] === "tasklists") return { items: [{ id: "inbox", title: "Inbox" }] }
    if (command[2] === "list") return { items: tasks }
    if (command[2] === "get") return tasks.find(task => task.id === request.params!.task)
    if (command[2] === "insert") {
      inserts++
      tasks.push({ id: "created", title: request.body!.title!, notes: request.body!.notes })
      throw new Error("lost response")
    }
    throw new Error("Unexpected command")
  }
  const args = {
    capture: { id: "hash", timestamp: "2026-09-05T10:00:00+02:00", raw: "Call plumber" },
    draft: { title: "Call plumber", question: "", research: "", duplicate: null },
    run,
  }
  await expect(transferCapture(args)).rejects.toThrow("lost response")
  await expect(transferCapture(args)).resolves.toMatchObject({ id: "created", listId: "inbox" })
  expect(inserts).toBe(1)
})

test("preserves an uncertain insertion for review when its task cannot be identified", async () => {
  const run = async (command: readonly string[]) =>
    command[1] === "tasklists" ? { items: [{ id: "inbox", title: "Inbox" }] } : { items: [] }
  await expect(
    transferCapture({
      capture: { id: "hash", timestamp: "2026-09-05T10:00:00+02:00", raw: "Call plumber" },
      draft: { title: "Call plumber", question: "", research: "", duplicate: null },
      insertionAttempted: true,
      run,
    }),
  ).rejects.toThrow("uncertain outcome")
})

test("uses the journaled destination after Herb rewords a newly inserted task", async () => {
  const tasks: GoogleTask[] = []
  let candidate: import("../types.ts").CaptureTarget | undefined
  let insertionAttempted = false
  let inserts = 0
  let failRead = true
  const run = async (command: readonly string[]) => {
    if (command[1] === "tasklists") return { items: [{ id: "inbox", title: "Inbox" }] }
    if (command[2] === "list") return { items: tasks }
    if (command[2] === "insert") {
      inserts++
      const task = { id: "created", title: "Renew card" }
      tasks.push(task)
      return task
    }
    if (command[2] === "get") {
      tasks[0]!.title = "Renew our Spanish residence cards"
      if (failRead) {
        failRead = false
        throw new Error("Read failed")
      }
      return tasks[0]
    }
    throw new Error("Unexpected command")
  }
  const args = {
    capture: { id: "hash", timestamp: "2026-09-05T10:00:00+02:00", raw: "Renew card" },
    draft: { title: "Renew card", question: "", research: "", duplicate: null },
    checkpoint: (target?: import("../types.ts").CaptureTarget) => {
      insertionAttempted = true
      if (target) candidate = target
    },
    run,
  }
  await expect(transferCapture(args)).rejects.toThrow("Read failed")
  await expect(transferCapture({ ...args, candidate, insertionAttempted })).resolves.toMatchObject({
    id: "created",
    title: "Renew our Spanish residence cards",
  })
  expect(inserts).toBe(1)
})
