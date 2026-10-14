import { describe, expect, test } from "vitest"

import { getPiCommandArgs } from "../getPiCommandArgs.ts"

describe("getPiCommandArgs", () => {
  test("uses the locally signed-in Codex provider", () => {
    expect(
      getPiCommandArgs({ prompt: "Select stories", rawBriefingPath: "raw/news.json" }),
    ).toEqual([
      "--provider",
      "openai-codex",
      "--model",
      "gpt-5.6-terra",
      "-p",
      "@raw/news.json",
      "Select stories",
    ])
  })
})
