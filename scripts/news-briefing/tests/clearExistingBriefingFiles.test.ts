import { existsSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { describe, expect, test } from "vitest"
import { clearExistingBriefingFiles } from "../clearExistingBriefingFiles.ts"

describe("clearExistingBriefingFiles", () => {
  test("removes final, raw, and selection files for the requested date only", async () => {
    const briefingDirectoryPath = mkdtempSync(path.join(tmpdir(), "briefings-final-"))
    const rawDirectoryPath = mkdtempSync(path.join(tmpdir(), "briefings-raw-"))
    const finalPath = path.join(briefingDirectoryPath, "2026-04-20.json")
    const rawPath = path.join(rawDirectoryPath, "2026-04-20.json")
    const selectionPath = path.join(rawDirectoryPath, "2026-04-20-selection.json")
    const otherPath = path.join(rawDirectoryPath, "2026-04-19.json")

    for (const filePath of [finalPath, rawPath, selectionPath, otherPath]) {
      writeFileSync(filePath, "{}\n")
    }

    await clearExistingBriefingFiles({
      briefingDirectoryPath,
      date: "2026-04-20",
      rawDirectoryPath,
    })

    expect(existsSync(finalPath)).toBe(false)
    expect(existsSync(rawPath)).toBe(false)
    expect(existsSync(selectionPath)).toBe(false)
    expect(existsSync(otherPath)).toBe(true)
  })

  test("succeeds when target files do not exist", async () => {
    const briefingDirectoryPath = mkdtempSync(path.join(tmpdir(), "briefings-final-"))
    const rawDirectoryPath = mkdtempSync(path.join(tmpdir(), "briefings-raw-"))

    await expect(
      clearExistingBriefingFiles({
        briefingDirectoryPath,
        date: "2026-04-20",
        rawDirectoryPath,
      }),
    ).resolves.toBeUndefined()
  })
})
