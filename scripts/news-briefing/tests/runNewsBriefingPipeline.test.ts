import { describe, expect, test } from "vitest"
import { runNewsBriefingPipeline } from "../runNewsBriefingPipeline.ts"

describe("runNewsBriefingPipeline", () => {
  test("fetches the requested date and synthesizes every missing briefing date", async () => {
    const events: string[] = []

    await runNewsBriefingPipeline({
      date: "2026-04-20",
      listMissingBriefingDates: () => ["2026-04-18", "2026-04-20"],
      runFetchStage: async date => {
        events.push(`fetch:${date}`)
        return { articles: [], createdAt: "2026-04-28T00:00:00.000Z", date }
      },
      runSynthesisStage: async date => {
        events.push(`synthesize:${date}`)
        return `public/briefings/${date}.json`
      },
    })

    expect(events).toEqual(["fetch:2026-04-20", "synthesize:2026-04-18", "synthesize:2026-04-20"])
  })
})
