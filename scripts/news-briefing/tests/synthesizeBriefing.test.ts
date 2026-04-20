import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { describe, expect, test } from "vitest"
import { synthesizeBriefing } from "../synthesizeBriefing.ts"

describe("synthesizeBriefing", () => {
  test("reads a raw file, invokes pi with a minimized prompt, and writes the final briefing JSON", async () => {
    const rootDirectoryPath = mkdtempSync(path.join(tmpdir(), "briefings-synthesize-"))
    const rawDirectoryPath = path.join(rootDirectoryPath, "public/briefings/raw")
    const briefingDirectoryPath = path.join(rootDirectoryPath, "public/briefings")

    mkdirSync(rawDirectoryPath, { recursive: true })
    mkdirSync(briefingDirectoryPath, { recursive: true })

    const rawBriefingPath = path.join(rawDirectoryPath, "2026-04-20.json")
    writeFileSync(
      rawBriefingPath,
      JSON.stringify({ date: "2026-04-20", articles: [{ headline: "Story" }] }, null, 2),
    )

    let receivedPrompt = ""
    let receivedRawBriefingPath = ""

    const briefingPath = await synthesizeBriefing({
      briefingDirectoryPath,
      date: "2026-04-20",
      rawDirectoryPath,
      runPi: async ({ prompt, rawBriefingPath: pathFromFunction }) => {
        receivedPrompt = prompt
        receivedRawBriefingPath = pathFromFunction

        return JSON.stringify({ sections: [{ title: "World", stories: [] }] }, null, 2)
      },
    })

    expect(receivedRawBriefingPath).toBe(rawBriefingPath)
    expect(receivedPrompt).toContain("Return only a JSON object")
    expect(receivedPrompt).toContain("Use the raw briefing file")
    expect(briefingPath).toBe(path.join(briefingDirectoryPath, "2026-04-20.json"))
    expect(JSON.parse(readFileSync(briefingPath, "utf8"))).toEqual({
      sections: [{ title: "World", stories: [] }],
    })
  })
})
