import { describe, expect, test } from "vitest"

import {
  getMorningBriefingArchiveRequest,
  getMorningBriefingPinRequest,
  getMorningBriefingPresentationThreadStartRequest,
  getMorningBriefingRecoveryThreadId,
  getMorningBriefingRecoveryThreadsRequest,
  getMorningBriefingThreadIdsToUnpin,
} from "../codexPresentation.ts"

describe("morning briefing Codex presentation", () => {
  test("creates a persistent presentation task, pins it, and selects only older briefings to unpin", () => {
    expect(getMorningBriefingPresentationThreadStartRequest()).toMatchObject({
      method: "thread/start",
      params: {
        cwd: "/Users/herbcaudill/Code/HerbCaudill/briefings",
        ephemeral: false,
        threadSource: "morning-briefing",
      },
    })
    expect(getMorningBriefingPinRequest("current")).toMatchObject({
      method: "thread/section/move",
      params: { threadId: "current" },
    })
    expect(
      getMorningBriefingThreadIdsToUnpin(
        [
          { id: "current", name: "Morning briefing – September 3, 2026" },
          { id: "old", name: "Morning briefing – September 2, 2026" },
          { id: "diagnostic", name: "Morning briefing diagnostics – September 2, 2026" },
          { id: "other", name: "Other task" },
        ],
        "current",
      ),
    ).toEqual(["old"])
    expect(getMorningBriefingArchiveRequest("failed", 12)).toEqual({
      method: "thread/archive",
      id: 12,
      params: { threadId: "failed" },
    })
  })

  test("can rediscover a presentation task when its start response was lost", () => {
    expect(
      getMorningBriefingPresentationThreadStartRequest("morning-briefing:unique"),
    ).toMatchObject({
      params: { threadSource: "morning-briefing:unique" },
    })
    expect(getMorningBriefingRecoveryThreadsRequest(7)).toEqual({
      method: "thread/list",
      id: 7,
      params: {
        cwd: "/Users/herbcaudill/Code/HerbCaudill/briefings",
        limit: 100,
        sortDirection: "desc",
        sortKey: "created_at",
        sourceKinds: ["appServer"],
        useStateDbOnly: true,
      },
    })
    expect(
      getMorningBriefingRecoveryThreadId(
        [
          { id: "other", name: null, threadSource: "morning-briefing:other" },
          { id: "partial", name: null, threadSource: "morning-briefing:unique" },
        ],
        "morning-briefing:unique",
      ),
    ).toBe("partial")
  })
})
