import { describe, expect, test } from "vitest"

import { upsertDailyBriefing } from "../dailyNote.ts"

const briefing = `## Daily briefing

### Sources

- [x] Gmail

### Calendar

Nothing scheduled.
`

describe("upsertDailyBriefing", () => {
  test("creates a briefing section in an empty note", () => {
    expect(upsertDailyBriefing("", briefing)).toBe(briefing)
  })

  test("appends a briefing while preserving existing note content exactly", () => {
    expect(upsertDailyBriefing("# Thursday\n\nExisting text.\n", briefing)).toBe(
      `# Thursday\n\nExisting text.\n\n${briefing}`,
    )
  })

  test("replaces only the existing briefing section", () => {
    const note = `# Thursday

Before.

## Daily briefing

Old briefing.

### Old subsection

Old details.

## Journal

After.
`

    expect(upsertDailyBriefing(note, briefing)).toBe(`# Thursday

Before.

${briefing}
## Journal

After.
`)
  })
})
