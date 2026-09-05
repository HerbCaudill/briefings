import { expect, test } from "vitest"
import type { GoogleTask, GwsRequest } from "../types.ts"
import { transferCapture } from "../transferCapture.ts"

test("recovers a task after a lost insert response and verifies its capture marker", async () => {
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
