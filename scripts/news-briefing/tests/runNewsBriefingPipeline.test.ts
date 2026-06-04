import { describe, expect, test } from "vitest"
import { runNewsBriefingPipeline } from "../runNewsBriefingPipeline.ts"

describe("runNewsBriefingPipeline", () => {
  test("fetches the requested date, synthesizes every missing briefing date, and logs progress", async () => {
    const events: string[] = []
    const messages: string[] = []

    await runNewsBriefingPipeline({
      date: "2026-04-20",
      listMissingBriefingDates: () => ["2026-04-18", "2026-04-20"],
      log: message => messages.push(message),
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
    expect(messages).toEqual([
      "Fetching raw briefing for 2026-04-20...",
      "Fetched raw briefing for 2026-04-20 with 0 articles.",
      "Found 2 missing final briefings.",
      "Synthesizing final briefing for 2026-04-18...",
      "Wrote final briefing to public/briefings/2026-04-18.json.",
      "Synthesizing final briefing for 2026-04-20...",
      "Wrote final briefing to public/briefings/2026-04-20.json.",
      "News briefing pipeline complete.",
    ])
  })
})
