import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, vi } from "vitest"
import { createInboxTasks } from "../createInboxTasks.ts"
import type { TasksClient } from "../../tasks/types.ts"

test("deduplicates completed tasks and resumes a saved capture after description failure", async () => {
  const statePath = mkdtempSync(join(tmpdir(), "briefing-capture-"))
  const record = {
    kind: "task" as const,
    id: "new",
    title: "New action",
    description: "",
    availability: "available",
    url: "https://tasks/?task=new",
  }
  const client = {
    spaceId: "space",
    list: vi
      .fn()
      .mockResolvedValue([{ ...record, id: "old", title: "Already captured", status: "done" }]),
    get: vi.fn().mockResolvedValue(record),
    write: vi.fn(),
  } as unknown as TasksClient
  let fail = true
  vi.mocked(client.write).mockImplementation(async (command, input) => {
    if (command === "capture")
      return {
        createdIds: ["new"],
        records: [{ ...record, creationKey: `capture:${input.eventKey}` }],
      }
    if (fail) {
      fail = false
      throw new Error("description lost")
    }
    return { affectedIds: ["new"], records: [record] }
  })
  const args = {
    client,
    statePath,
    date: "2026-09-30",
    tasks: [
      { title: "Already captured", notes: "" },
      { title: "New action", notes: "Context" },
    ],
  }
  await expect(createInboxTasks(args)).rejects.toThrow("description lost")
  expect(await createInboxTasks(args)).toEqual([
    { title: "New action", notes: "Context", url: record.url },
  ])
  expect(vi.mocked(client.write).mock.calls.filter(call => call[0] === "capture")).toHaveLength(1)
  const descriptions = vi
    .mocked(client.write)
    .mock.calls.filter(call => call[0] === "save-description")
  expect(descriptions[0]).toEqual(descriptions[1])
})
