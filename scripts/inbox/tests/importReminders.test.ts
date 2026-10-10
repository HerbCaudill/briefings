import { expect, test, vi } from "vitest"
import { importReminders } from "../importReminders.ts"
import type { TasksClient } from "../../tasks/types.ts"

const reminder = { id: "x-apple-reminder://ABC", title: "Call plumber" }

function fakeClient(write: TasksClient["write"]) {
  return {
    spaceId: "space",
    write: vi.fn(write),
    get: vi.fn(async (kind: "task", id: string) => ({
      kind,
      id,
      title: "Call plumber",
      url: `https://tasks/?task=${id}`,
      availability: "available",
    })),
  } as unknown as TasksClient
}

test("captures each reminder in the Tasks inbox, then marks it done", async () => {
  const complete = vi.fn(async () => {})
  const client = fakeClient(async (_command, input) => ({
    createdIds: ["new"],
    records: [
      {
        kind: "task",
        id: "new",
        title: String(input.title),
        url: "",
        creationKey: `capture:${String(input.eventKey)}`,
      },
    ],
  }))
  expect(
    await importReminders({ reminders: { list: async () => [reminder], complete }, client }),
  ).toBe(1)
  expect(vi.mocked(client.write).mock.calls[0]![1]).toMatchObject({ title: "Call plumber" })
  expect(client.get).toHaveBeenCalledWith("task", "new")
  expect(complete).toHaveBeenCalledWith(reminder.id)
})

test("leaves the reminder open when the task cannot be verified", async () => {
  const complete = vi.fn(async () => {})
  const client = fakeClient(async () => ({ createdIds: [], records: [] }))
  await expect(
    importReminders({ reminders: { list: async () => [reminder], complete }, client }),
  ).rejects.toThrow()
  expect(complete).not.toHaveBeenCalled()
})
