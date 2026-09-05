import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, test } from "vitest"

import { buildCarryoverMarkdown } from "../carryover.ts"

describe("buildCarryoverMarkdown", () => {
  test("keeps only Open issues from the three latest prior briefings", () => {
    const root = mkdtempSync(join(tmpdir(), "morning-carryover-"))
    const dailyDirectoryPath = join(root, "daily")
    mkdirSync(dailyDirectoryPath)

    writeDailyNote(dailyDirectoryPath, "2026-08-30", "Oldest issue")
    writeDailyNote(dailyDirectoryPath, "2026-08-31", "Older issue")
    writeFileSync(join(dailyDirectoryPath, "2026-09-01.md"), "# Note without a briefing\n")
    writeDailyNote(dailyDirectoryPath, "2026-09-02", "Newest issue")
    writeDailyNote(dailyDirectoryPath, "2026-09-03", "Today's issue")

    const carryover = buildCarryoverMarkdown({
      dailyDirectoryPath,
      date: "2026-09-03",
    })

    expect(carryover).toContain("## 2026-09-02")
    expect(carryover).toContain("## 2026-08-31")
    expect(carryover).toContain("## 2026-08-30")
    expect(carryover).not.toContain("Today's issue")
    expect(carryover).not.toContain("Completed work")
    expect(carryover).not.toContain("Follow up on")
  })
})

function writeDailyNote(directoryPath: string, date: string, issue: string): void {
  writeFileSync(
    join(directoryPath, `${date}.md`),
    `# Daily note

## Daily briefing

### Sources

- [x] Gmail

### Open issues

${issue}

### Yesterday

Completed work.

### Next steps

1. Follow up on ${issue}.

## Journal

Unrelated.
`,
  )
}
