import { describe, expect, test } from "vitest"

import { formatLocalDate, getLocalTimeZone } from "../date.ts"

describe("local morning briefing date", () => {
  test("uses the supplied local time zone instead of a fixed home time zone", () => {
    const instant = new Date("2026-09-03T02:30:00Z")

    expect(formatLocalDate(instant, "America/Los_Angeles")).toBe("2026-09-02")
    expect(formatLocalDate(instant, "Asia/Tokyo")).toBe("2026-09-03")
  })

  test("detects the machine's current time zone", () => {
    expect(getLocalTimeZone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
  })
})
