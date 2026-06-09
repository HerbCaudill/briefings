import { describe, expect, test } from "vitest"

import { getPiCommandArgs } from "../getPiCommandArgs.ts"

describe("getPiCommandArgs", () => {
  test("selects the Anthropic provider used by the briefing workflow secret", () => {
    expect(
      getPiCommandArgs({ prompt: "Select stories", rawBriefingPath: "raw/news.json" }),
    ).toEqual(["--provider", "anthropic", "-p", "@raw/news.json", "Select stories"])
  })
})
