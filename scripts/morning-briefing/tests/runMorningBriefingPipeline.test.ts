import { describe, expect, test, vi } from "vitest"

import { MORNING_BRIEFING_LANES } from "../constants.ts"
import { runMorningBriefingPipeline } from "../runMorningBriefingPipeline.ts"
import type { MorningBriefingGatherResult } from "../types.ts"

describe("runMorningBriefingPipeline", () => {
  test("gathers all lanes concurrently and publishes the same final markdown to both outputs", async () => {
    const startedLanes: string[] = []
    const releases = new Map<string, () => void>()
    const gathered = MORNING_BRIEFING_LANES.map(lane => createGatherResult(lane.key))
    const finalMarkdown = "## Daily briefing\n\n### Sources\n\nComplete.\n"
    const publishDailyNote = vi.fn().mockResolvedValue(undefined)
    const presentInCodex = vi.fn().mockResolvedValue(undefined)

    const runPromise = runMorningBriefingPipeline({
      gatherLane: lane => {
        startedLanes.push(lane.key)
        return new Promise(resolve =>
          releases.set(lane.key, () => resolve(createGatherResult(lane.key))),
        )
      },
      lanes: MORNING_BRIEFING_LANES,
      prepare: vi.fn().mockResolvedValue(undefined),
      presentInCodex,
      publishDailyNote,
      synthesize: vi.fn().mockResolvedValue(finalMarkdown),
    })

    await vi.waitFor(() => expect(startedLanes).toHaveLength(MORNING_BRIEFING_LANES.length))
    MORNING_BRIEFING_LANES.forEach(lane => releases.get(lane.key)?.())

    await expect(runPromise).resolves.toBe(finalMarkdown)
    expect(gathered).toHaveLength(3)
    expect(publishDailyNote).toHaveBeenCalledWith(finalMarkdown)
    expect(presentInCodex).toHaveBeenCalledWith(finalMarkdown)
    expect(publishDailyNote.mock.invocationCallOrder[0]).toBeLessThan(
      presentInCodex.mock.invocationCallOrder[0]!,
    )
  })

  test("does not publish when synthesis fails", async () => {
    const publishDailyNote = vi.fn()
    const presentInCodex = vi.fn()

    await expect(
      runMorningBriefingPipeline({
        gatherLane: async lane => createGatherResult(lane.key),
        lanes: MORNING_BRIEFING_LANES,
        prepare: vi.fn().mockResolvedValue(undefined),
        presentInCodex,
        publishDailyNote,
        synthesize: vi.fn().mockRejectedValue(new Error("invalid synthesis")),
      }),
    ).rejects.toThrow("invalid synthesis")

    expect(publishDailyNote).not.toHaveBeenCalled()
    expect(presentInCodex).not.toHaveBeenCalled()
  })

  test("waits for sibling gatherers to stop before rejecting", async () => {
    let releaseSibling: () => void = () => undefined
    let rejected = false
    const publishDailyNote = vi.fn()

    const runPromise = runMorningBriefingPipeline({
      gatherLane: lane => {
        if (lane.key === "schedule") return Promise.reject(new Error("schedule failed"))
        if (lane.key === "communications")
          return new Promise(resolve => {
            releaseSibling = () => resolve(createGatherResult(lane.key))
          })
        return Promise.resolve(createGatherResult(lane.key))
      },
      lanes: MORNING_BRIEFING_LANES,
      prepare: vi.fn().mockResolvedValue(undefined),
      presentInCodex: vi.fn(),
      publishDailyNote,
      synthesize: vi.fn(),
    })
    void runPromise.catch(() => {
      rejected = true
    })

    await new Promise(resolve => setTimeout(resolve, 10))
    expect(rejected).toBe(false)
    releaseSibling()
    await expect(runPromise).rejects.toThrow("schedule failed")
    expect(publishDailyNote).not.toHaveBeenCalled()
  })
})

function createGatherResult(lane: string): MorningBriefingGatherResult {
  return { coverage: [], lane, report: `${lane} report` }
}
