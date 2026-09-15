import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, expect, test, vi } from "vitest"

import { presentMorningBriefingInCodex } from "../codexPresentation.ts"
import { publishDailyBriefingToNote } from "../dailyNote.ts"
import { runLiveMorningBriefing } from "../liveRuntime.ts"
import { syncMorningBriefingToObsidian } from "../obsidian.ts"
import { getMorningBriefingRunPaths } from "../runPaths.ts"

vi.mock("../../inbox/runInboxIntake.ts", () => ({ runInboxIntake: vi.fn() }))
vi.mock("../../inbox/startInboxResearch.ts", () => ({ startInboxResearch: vi.fn() }))
vi.mock("../gatherMorningBriefingLane.ts", () => ({
  gatherMorningBriefingLane: vi
    .fn()
    .mockResolvedValue({ coverage: [], lane: "schedule", report: "" }),
}))
vi.mock("../synthesizeMorningBriefing.ts", () => ({
  synthesizeMorningBriefing: vi
    .fn()
    .mockResolvedValue({ markdown: "## Daily briefing\n", newTasks: [] }),
}))
vi.mock("../createInboxTasks.ts", () => ({ createInboxTasks: vi.fn().mockResolvedValue([]) }))
vi.mock("../finalizeBriefing.ts", () => ({
  finalizeMorningBriefing: vi.fn((markdown: string) => markdown),
}))
vi.mock("../codexPresentation.ts", () => ({ presentMorningBriefingInCodex: vi.fn() }))
vi.mock("../obsidian.ts", () => ({ syncMorningBriefingToObsidian: vi.fn() }))
vi.mock("../dailyNote.ts", async importOriginal => ({
  ...(await importOriginal<typeof import("../dailyNote.ts")>()),
  publishDailyBriefingToNote: vi.fn(
    (await importOriginal<typeof import("../dailyNote.ts")>()).publishDailyBriefingToNote,
  ),
}))

const directories: string[] = []

afterEach(() => {
  directories.forEach(directory => rmSync(directory, { recursive: true, force: true }))
  directories.length = 0
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

test.each(["Obsidian Sync did not finish after 30 status checks", "Obsidian CLI unavailable"])(
  "delivers the saved briefing and records a sync failure: %s",
  async message => {
    const args = createRunArgs()
    vi.mocked(syncMorningBriefingToObsidian).mockRejectedValueOnce(new Error(message))
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {})

    const markdown = await runLiveMorningBriefing(args)

    expect(readFileSync(join(args.dailyNotesDirectoryPath, `${args.date}.md`), "utf8")).toBe(
      markdown,
    )
    expect(presentMorningBriefingInCodex).toHaveBeenCalledWith(
      expect.objectContaining({ briefing: markdown }),
    )
    expect(warning).toHaveBeenCalledWith(expect.stringContaining(message))
    const paths = getMorningBriefingRunPaths(args)
    expect(JSON.parse(readFileSync(paths.manifestPath, "utf8"))).toMatchObject({
      status: "complete",
      stages: {
        obsidian: { status: "complete" },
        "obsidian-sync": { status: "failed", error: message },
        "codex-presentation": { status: "complete" },
      },
    })
  },
)

test("still fails when the daily note cannot be saved", async () => {
  const args = createRunArgs()
  vi.mocked(publishDailyBriefingToNote).mockImplementationOnce(() => {
    throw new Error("disk full")
  })

  await expect(runLiveMorningBriefing(args)).rejects.toThrow("disk full")
  expect(presentMorningBriefingInCodex).not.toHaveBeenCalled()
})

/** Keep all run artifacts and notes in an isolated temporary directory. */
function createRunArgs() {
  const root = mkdtempSync(join(tmpdir(), "morning-briefing-sync-"))
  directories.push(root)
  mkdirSync(join(root, "daily"))
  return {
    date: "2026-09-15",
    now: new Date("2026-09-15T05:00:00Z"),
    timeZone: "Europe/Madrid",
    stateDirectoryPath: join(root, "state"),
    dailyNotesDirectoryPath: join(root, "daily"),
  }
}
