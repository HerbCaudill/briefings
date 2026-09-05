import { describe, expect, test } from "vitest"

import { MORNING_BRIEFING_LANES } from "../constants.ts"
import { finalizeMorningBriefing } from "../finalizeBriefing.ts"

const sources = MORNING_BRIEFING_LANES.flatMap(lane => lane.sources)
  .map(source => `- [x] ${source}`)
  .join("\n")
const synthesizedBriefing = `## Daily briefing

### Sources

${sources}

### Calendar

Clear.

### Other calendars

Clear.

### Open issues

None.

### Yesterday

- Work.

### Proposed standup

\`\`\`text
✅ *Yesterday*
- Briefings: worked

🎯 *Today*
- Briefings: continue
\`\`\`
`

describe("finalizeMorningBriefing", () => {
  test("finishes the briefing with links to tasks that were actually created", () => {
    expect(
      finalizeMorningBriefing(synthesizedBriefing, [
        {
          notes: "Source context",
          title: "Reply to Ann",
          url: "https://tasks.google.com/task/task-id?sa=6",
        },
      ]),
    ).toBe(`${synthesizedBriefing}
### New tasks

- [Reply to Ann](https://tasks.google.com/task/task-id?sa=6)
`)
  })

  test("states when no new tasks were needed", () => {
    expect(finalizeMorningBriefing(synthesizedBriefing, [])).toBe(`${synthesizedBriefing}
### New tasks

- None.
`)
  })
})
