import { describe, expect, test } from "vitest"

import { SELECTION_PROMPT } from "../constants.ts"

describe("SELECTION_PROMPT", () => {
  test("asks for a full briefing-sized story set", () => {
    expect(SELECTION_PROMPT).toMatch(/14 to 18 stories/i)
  })
})
