import { describe, expect, test } from "vitest"

import { MORNING_BRIEFING_LANES } from "../constants.ts"
import { validateFinalBriefingMarkdown } from "../validateBriefing.ts"

const sourceChecklist = MORNING_BRIEFING_LANES.flatMap(lane => lane.sources)
  .map(source => `- [x] ${source}`)
  .join("\n")

const validBriefing = `## Daily briefing

### Sources

${sourceChecklist}

### Calendar

Clear.

### Other calendars

Clear.

### Open issues

None.

### Yesterday

- Work.

### Next steps

Everything actionable is already captured in Google Tasks.

### Proposed standup

\`\`\`text
✅ *Yesterday*
- Briefings: worked

🎯 *Today*
- Briefings: continue
\`\`\`
`

describe("validateFinalBriefingMarkdown", () => {
  test("normalizes a complete briefing to one trailing newline", () => {
    expect(validateFinalBriefingMarkdown(`${validBriefing}\n`)).toBe(validBriefing)
  })

  test("rejects missing or reordered sections", () => {
    expect(() =>
      validateFinalBriefingMarkdown(validBriefing.replace("### Sources", "### Missing")),
    ).toThrow("missing ### Sources")
    expect(() =>
      validateFinalBriefingMarkdown(
        validBriefing
          .replace("### Calendar", "### Temporary")
          .replace("### Sources", "### Calendar"),
      ),
    ).toThrow("missing ### Sources")
  })

  test("rejects missing source coverage and an incomplete standup block", () => {
    expect(() => validateFinalBriefingMarkdown(validBriefing.replace("- [x] Gmail\n", ""))).toThrow(
      "coverage entry for Gmail",
    )
    expect(() =>
      validateFinalBriefingMarkdown(validBriefing.replace("🎯 *Today*", "Today")),
    ).toThrow("copy-ready standup block")
  })
})
