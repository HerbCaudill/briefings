import { describe, expect, it } from "vitest"

import { findBriefingThread, hasWatchedWork, shouldNotifyHerb } from "../heartbeat.ts"

describe("hasWatchedWork", () => {
  it("is true when the checklist has an entry", () => {
    expect(hasWatchedWork("# Watching\n\nIntro.\n\n## DevResults e2e parity\n\n- Item\n")).toBe(
      true,
    )
  })

  it("is false when the checklist has only its introduction", () => {
    expect(hasWatchedWork("# Watching\n\nWork the heartbeat keeps an eye on.\n")).toBe(false)
  })
})

describe("findBriefingThread", () => {
  const threads = [
    { threadId: "news", title: "News briefing – 2026-10-31", createdAt: "2026-10-31T07:10:00Z" },
    { threadId: "old", title: "Morning briefing – 2026-10-30", createdAt: "2026-10-30T07:10:00Z" },
    {
      threadId: "first",
      title: "Morning briefing – 2026-10-31",
      createdAt: "2026-10-31T07:05:00Z",
    },
    {
      threadId: "rerun",
      title: "Morning briefing – 2026-10-31",
      createdAt: "2026-10-31T08:00:00Z",
    },
  ]

  it("picks the newest morning briefing for the date", () => {
    expect(findBriefingThread({ threads, date: "2026-10-31" })?.threadId).toBe("rerun")
  })

  it("returns nothing when the date has no briefing", () => {
    expect(findBriefingThread({ threads, date: "2026-11-01" })).toBeUndefined()
  })
})

describe("shouldNotifyHerb", () => {
  it("notifies about a new blocker", () => {
    expect(shouldNotifyHerb({ blockerKey: "disk-full", notifiedBlockerKeys: ["other"] })).toBe(true)
  })

  it("reports a repeated blocker only once", () => {
    expect(shouldNotifyHerb({ blockerKey: "disk-full", notifiedBlockerKeys: ["disk-full"] })).toBe(
      false,
    )
  })
})
