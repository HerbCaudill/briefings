import { describe, expect, test, vi } from "vitest"

import { createInboxTasks } from "../createInboxTasks.ts"

describe("createInboxTasks", () => {
  test("creates only titles absent from incomplete and completed tasks across all lists", async () => {
    const runCommand = vi.fn(async (command: readonly string[], request: unknown) => {
      const method = command.join(" ")
      if (method === "tasks tasklists list")
        return {
          items: [
            { id: "inbox", title: "Inbox" },
            { id: "today", title: "Today" },
          ],
        }
      if (method === "tasks tasks list") {
        const tasklist = (request as { params: { tasklist: string } }).params.tasklist
        return tasklist === "today"
          ? { items: [{ id: "done", title: "Already captured" }] }
          : { items: [] }
      }
      return { id: "created-id", title: "New action" }
    })

    await expect(
      createInboxTasks({
        runCommand,
        tasks: [
          { notes: "Old", title: "  already   CAPTURED " },
          { notes: "Context", title: "New action" },
          { notes: "Duplicate draft", title: "new action" },
        ],
      }),
    ).resolves.toEqual([
      {
        notes: "Context",
        title: "New action",
        url: "https://tasks.google.com/task/created-id?sa=6",
      },
    ])
    expect(runCommand).toHaveBeenCalledWith(
      ["tasks", "tasks", "insert"],
      expect.objectContaining({ params: { tasklist: "inbox" } }),
    )
  })
})
