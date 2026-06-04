import { describe, expect, test } from "vitest"
import { runNewsBriefingPipeline } from "../runNewsBriefingPipeline.ts"

describe("runNewsBriefingPipeline", () => {
  test("clears the requested date, fetches it, synthesizes every missing briefing date, and commits generated files", async () => {
    const events: string[] = []

    await runNewsBriefingPipeline({
      clearExistingBriefingFiles: async date => {
        events.push(`clear:${date}`)
      },
      commitAndPushGeneratedBriefings: async dates => {
        events.push(`commit:${dates.join(",")}`)
      },
      date: "2026-04-20",
      listMissingBriefingDates: () => ["2026-04-18", "2026-04-20"],
      runFetchStage: async date => {
        events.push(`fetch:${date}`)
        return { articles: [], date }
      },
      runSynthesisStage: async date => {
        events.push(`synthesize:${date}`)
        return `public/briefings/${date}.json`
      },
    })

    expect(events).toEqual([
      "clear:2026-04-20",
      "fetch:2026-04-20",
      "synthesize:2026-04-18",
      "synthesize:2026-04-20",
      "commit:2026-04-18,2026-04-20",
    ])
  })
})
