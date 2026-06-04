import path from "node:path"
import { describe, expect, test } from "vitest"
import {
  getBriefingDateFromFileName,
  getBriefingIndexPath,
  getFinalBriefingPath,
  getGeneratedBriefingGitPaths,
  getRawBriefingPath,
  getSelectionBriefingPath,
  isDatedBriefingJsonFileName,
} from "../briefingPaths.ts"

describe("briefingPaths", () => {
  test("builds the raw, selection, and final briefing file paths for a date", () => {
    expect(getRawBriefingPath("public/briefings/raw", "2026-04-20")).toBe(
      path.join("public/briefings/raw", "2026-04-20.json"),
    )
    expect(getSelectionBriefingPath("public/briefings/raw", "2026-04-20")).toBe(
      path.join("public/briefings/raw", "2026-04-20-selection.json"),
    )
    expect(getFinalBriefingPath("public/briefings", "2026-04-20")).toBe(
      path.join("public/briefings", "2026-04-20.json"),
    )
    expect(getBriefingIndexPath("public/briefings")).toBe(
      path.join("public/briefings", "index.json"),
    )
  })

  test("builds generated briefing git paths for each date", () => {
    expect(getGeneratedBriefingGitPaths(["2026-04-18", "2026-04-20"])).toEqual([
      "public/briefings/2026-04-18.json",
      "public/briefings/raw/2026-04-18.json",
      "public/briefings/raw/2026-04-18-selection.json",
      "public/briefings/2026-04-20.json",
      "public/briefings/raw/2026-04-20.json",
      "public/briefings/raw/2026-04-20-selection.json",
    ])
  })

  test("recognizes dated briefing JSON file names and extracts their dates", () => {
    expect(isDatedBriefingJsonFileName("2026-04-20.json")).toBe(true)
    expect(isDatedBriefingJsonFileName("2026-04-20-selection.json")).toBe(false)
    expect(isDatedBriefingJsonFileName("index.json")).toBe(false)

    expect(getBriefingDateFromFileName("2026-04-20.json")).toBe("2026-04-20")
  })
})
