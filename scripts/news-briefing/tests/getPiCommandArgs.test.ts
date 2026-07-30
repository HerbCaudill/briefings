import { describe, expect, test } from "vitest"

import { getPiCommandArgs } from "../getPiCommandArgs.ts"

describe("getPiCommandArgs", () => {
  test("selects the Codex provider used by the briefing workflow secret", () => {
    expect(
      getPiCommandArgs({ prompt: "Select stories", rawBriefingPath: "raw/news.json" }),
    ).toEqual([
      "--provider",
      "openai",
      "--model",
      "gpt-5.6-terra",
      "-p",
      "@raw/news.json",
      "Select stories",
    ])
  })
})
