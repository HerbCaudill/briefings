import { describe, expect, it } from "vitest"

import {
  findBriefingThread,
  getE2eHealth,
  shouldInvestigate,
  shouldNotifyHerb,
} from "../heartbeat.ts"

const running = (count: number) => Array.from({ length: count }, () => ({ status: "running" }))

describe("getE2eHealth", () => {
  it("is active when enough agents are running and commits are landing quickly", () => {
    expect(getE2eHealth({ threads: running(3), commitsLastHour: 8 })).toBe("active")
  })

  it("is slow when too few agents are running", () => {
    expect(getE2eHealth({ threads: running(1), commitsLastHour: 20 })).toBe("slow")
  })

  it("is slow when commits are landing below the floor", () => {
    expect(getE2eHealth({ threads: running(5), commitsLastHour: 3 })).toBe("slow")
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

describe("shouldInvestigate", () => {
  const now = new Date("2026-10-31T12:00:00Z")

  it("always investigates a stall", () => {
    expect(shouldInvestigate({ health: "stalled", lastPaceCheckAt: now.toISOString(), now })).toBe(
      true,
    )
  })

  it("never investigates active work", () => {
    expect(shouldInvestigate({ health: "active", now })).toBe(false)
  })

  it("investigates slow work the first time", () => {
    expect(shouldInvestigate({ health: "slow", now })).toBe(true)
  })

  it("leaves slow work alone within two hours of the last check", () => {
    expect(
      shouldInvestigate({ health: "slow", lastPaceCheckAt: "2026-10-31T10:30:00Z", now }),
    ).toBe(false)
  })

  it("checks slow work again after two hours", () => {
    expect(
      shouldInvestigate({ health: "slow", lastPaceCheckAt: "2026-10-31T09:59:00Z", now }),
    ).toBe(true)
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
