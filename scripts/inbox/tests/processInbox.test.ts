import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, vi } from "vitest"

import { processInbox } from "../processInbox.ts"

test("verifies a transfer before archiving and preserves captures appended during classification", async () => {
  const root = mkdtempSync(join(tmpdir(), "capture-test-"))
  const inboxPath = join(root, "inbox.md")
  const archivePath = join(root, "Inbox archive.md")
  const original = "2026-09-03T11:24:07+02:00: Keep laundry going today"
  const later = "2026-09-05T15:00:00+02:00: Call the plumber\n"
  writeFileSync(inboxPath, original)
  const transfer = vi
    .fn()
    .mockResolvedValue({
      id: "task",
      listId: "inbox",
      title: "Keep laundry going",
      url: "https://tasks.google.com/task/task",
    })
  const args = {
    inboxPath,
    archivePath,
    statePath: join(root, "state"),
    date: "2026-09-05",
    classify: vi.fn(async () => {
      writeFileSync(inboxPath, `${original}\n${later}`)
      return {
        title: "Keep laundry going",
        question: "Still relevant? Originally September 3.",
        research: "",
        duplicate: null,
      }
    }),
    transfer,
  }
  await processInbox(args)
  expect(readFileSync(inboxPath, "utf8")).toBe(later)
  expect(readFileSync(archivePath, "utf8")).toContain(original)
  expect(readFileSync(archivePath, "utf8")).toContain("https://tasks.google.com/task/task")

  // A sync replay must not create another task or archive entry.
  writeFileSync(inboxPath, original)
  await processInbox(args)
  expect(transfer).toHaveBeenCalledTimes(1)
  expect(readFileSync(archivePath, "utf8").split(original)).toHaveLength(2)
})

test("keeps the capture when task verification fails", async () => {
  const root = mkdtempSync(join(tmpdir(), "capture-test-"))
  const inboxPath = join(root, "inbox.md")
  const original = "2026-09-04T09:33:35+02:00: Look into residence renewal\n"
  writeFileSync(inboxPath, original)
  await expect(
    processInbox({
      inboxPath,
      archivePath: join(root, "Inbox archive.md"),
      statePath: join(root, "state"),
      date: "2026-09-05",
      classify: async () => ({
        title: "Look into residence renewal",
        question: "",
        research: "Check renewal requirements",
        duplicate: null,
      }),
      transfer: async () => {
        throw new Error("verification failed")
      },
    }),
  ).rejects.toThrow("verification failed")
  expect(readFileSync(inboxPath, "utf8")).toBe(original)
})
