import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, vi } from "vitest"
import { runInboxIntake } from "../runInboxIntake.ts"
import { processXBookmarks } from "../processXBookmarks.ts"
import { processInbox } from "../processInbox.ts"

vi.mock("../constants.ts", () => ({
  INBOX_STATE_PATH: mkdtempSync(join(tmpdir(), "intake-")),
  VAULT_PATH: "vault",
}))
vi.mock("../processXBookmarks.ts", () => ({ processXBookmarks: vi.fn() }))
vi.mock("../processInbox.ts", () => ({ processInbox: vi.fn() }))
vi.mock("../parseCaptures.ts", () => ({ parseCaptures: () => ["capture"] }))
vi.mock("../importReminders.ts", () => ({ importReminders: vi.fn(async () => 0) }))
vi.mock("node:fs", async importOriginal => ({
  ...(await importOriginal<typeof import("node:fs")>()),
  existsSync: () => true,
  readFileSync: () => "capture",
}))

test.runIf(process.platform === "win32")(
  "runs bookmark intake even when Obsidian fails, and still runs Obsidian when X fails",
  async () => {
    vi.mocked(processInbox).mockRejectedValueOnce(new Error("Obsidian unavailable"))
    vi.mocked(processXBookmarks).mockResolvedValueOnce(1)
    await expect(runInboxIntake()).rejects.toThrow("Obsidian unavailable")
    expect(processXBookmarks).toHaveBeenCalledTimes(1)
    vi.mocked(processInbox).mockResolvedValueOnce(2)
    vi.mocked(processXBookmarks).mockRejectedValueOnce(new Error("X offline"))
    await expect(runInboxIntake()).rejects.toThrow("X offline")
    expect(processInbox).toHaveBeenCalledTimes(2)
  },
)
