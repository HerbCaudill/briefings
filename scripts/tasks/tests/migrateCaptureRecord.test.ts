import { expect, test, vi } from "vitest"
import { migrateCaptureRecord } from "../migrateCaptureRecord.ts"
import type { TasksClient } from "../types.ts"

const legacy = {
  capture: { id: "capture", raw: "original text", timestamp: "2026-09-01T00:00:00Z" },
  draft: { title: "Original title", question: "Question", research: "Scope", duplicate: null },
  target: { id: "google-id", listId: "old-list", title: "Original title", url: "old-url" },
  date: "2026-09-01",
}
test("resolves a legacy target to its promoted project while preserving the complete original journal", async () => {
  const client = {
    spaceId: "space",
    resolve: vi.fn().mockResolvedValue({
      kind: "project",
      id: "project",
      title: "Current title",
      url: "new-url",
      availability: "available",
    }),
  } as unknown as TasksClient
  const record = await migrateCaptureRecord(legacy, client)
  expect(client.resolve).toHaveBeenCalledWith("google-tasks:google-id")
  expect(record).toMatchObject({
    version: 2,
    legacy,
    target: { kind: "project", spaceId: "space", id: "project" },
    capture: legacy.capture,
    draft: legacy.draft,
  })
})
test("keeps missing mappings and uncertain old insertions actionable", async () => {
  const client = {
    spaceId: "space",
    resolve: vi.fn().mockRejectedValue(new Error("unknown")),
  } as unknown as TasksClient
  await expect(migrateCaptureRecord(legacy, client)).rejects.toThrow("unknown")
  await expect(
    migrateCaptureRecord({ ...legacy, target: undefined, insertionAttempted: true }, client),
  ).rejects.toThrow("uncertain")
})
