import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, test } from "vitest"
import { collectRecentBriefingSourceUrls } from "../collectRecentBriefingSourceUrls.ts"

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directoryPath of temporaryDirectories.splice(0)) {
    rmSync(directoryPath, { force: true, recursive: true })
  }
})

function writeFinalBriefing(directoryPath: string, date: string, sourceUrls: string[]) {
  const briefing = {
    sections: [
      {
        stories: [
          {
            body: "Story body",
            headline: "Story headline",
            sources: sourceUrls.map(url => ({ name: "Source", url })),
          },
        ],
        title: "World",
      },
    ],
  }

  writeFileSync(path.join(directoryPath, `${date}.json`), JSON.stringify(briefing, null, 2))
}

describe("collectRecentBriefingSourceUrls", () => {
  test("collects source URLs from briefings inside the lookback window only", () => {
    const briefingDirectoryPath = mkdtempSync(path.join(tmpdir(), "briefings-final-"))
    temporaryDirectories.push(briefingDirectoryPath)

    writeFinalBriefing(briefingDirectoryPath, "2026-07-11", ["https://example.com/recent-story"])
    writeFinalBriefing(briefingDirectoryPath, "2026-07-05", ["https://example.com/window-edge"])
    writeFinalBriefing(briefingDirectoryPath, "2026-07-04", ["https://example.com/too-old"])
    writeFinalBriefing(briefingDirectoryPath, "2026-07-12", ["https://example.com/same-day"])

    expect(
      collectRecentBriefingSourceUrls({
        briefingDirectoryPath,
        date: "2026-07-12",
        lookbackDays: 7,
      }),
    ).toEqual(new Set(["https://example.com/recent-story", "https://example.com/window-edge"]))
  })

  test("skips unreadable briefing files and non-briefing files", () => {
    const briefingDirectoryPath = mkdtempSync(path.join(tmpdir(), "briefings-final-"))
    temporaryDirectories.push(briefingDirectoryPath)

    writeFinalBriefing(briefingDirectoryPath, "2026-07-11", ["https://example.com/valid-story"])
    writeFileSync(path.join(briefingDirectoryPath, "2026-07-10.json"), "not valid json")
    writeFileSync(path.join(briefingDirectoryPath, "index.json"), "[]")

    expect(
      collectRecentBriefingSourceUrls({
        briefingDirectoryPath,
        date: "2026-07-12",
        lookbackDays: 7,
      }),
    ).toEqual(new Set(["https://example.com/valid-story"]))
  })

  test("returns an empty set when the briefing directory does not exist", () => {
    expect(
      collectRecentBriefingSourceUrls({
        briefingDirectoryPath: path.join(tmpdir(), "briefings-missing-directory"),
        date: "2026-07-12",
        lookbackDays: 7,
      }),
    ).toEqual(new Set())
  })
})
