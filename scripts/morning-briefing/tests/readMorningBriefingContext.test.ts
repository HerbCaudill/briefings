import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { readMorningBriefingContext } from "../readMorningBriefingContext.ts"

describe("readMorningBriefingContext", () => {
  it("loads the complete standing context for an agent prompt", () => {
    const directoryPath = mkdtempSync(join(tmpdir(), "morning-briefing-context-"))
    const contextPath = join(directoryPath, "context.md")
    writeFileSync(contextPath, "# Morning briefing context\n\n- Keep this guidance.\n")

    expect(readMorningBriefingContext(contextPath)).toBe(
      "# Morning briefing context\n\n- Keep this guidance.",
    )
  })
})
