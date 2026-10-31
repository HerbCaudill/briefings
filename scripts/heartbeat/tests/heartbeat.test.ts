import { describe, expect, it } from "vitest"

import { findBriefingThread, getE2eHealth, shouldNotifyHerb } from "../heartbeat.ts"

describe("getE2eHealth", () => {
  it("is active when an agent is running and commits landed", () => {
    expect(getE2eHealth({ threads: [{ status: "running" }], commitsLastHour: 3 })).toBe("active")
  })

  it("needs a look when an agent is running without recent commits", () => {
    expect(getE2eHealth({ threads: [{ status: "running" }], commitsLastHour: 0 })).toBe("stalled")
  })

  it("needs a look when commits landed but nothing is running", () => {
    expect(getE2eHealth({ threads: [{ status: "completed" }], commitsLastHour: 5 })).toBe("stalled")
  })

  it("doesn't count a thread that is waiting for an answer as running", () => {
    expect(getE2eHealth({ threads: [{ status: "waiting" }], commitsLastHour: 5 })).toBe("stalled")
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
