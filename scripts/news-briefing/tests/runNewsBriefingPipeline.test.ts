import { describe, expect, test } from "vitest"
import { runNewsBriefingPipeline } from "../runNewsBriefingPipeline.ts"

describe("runNewsBriefingPipeline", () => {
  test("clears the requested date, fetches it, synthesizes every missing briefing date, and logs progress", async () => {
    const events: string[] = []
    const messages: string[] = []

    await runNewsBriefingPipeline({
      clearExistingBriefingFiles: async date => {
        events.push(`clear:${date}`)
      },
      date: "2026-04-20",
      listMissingBriefingDates: () => ["2026-04-18", "2026-04-20"],
      log: message => messages.push(message),
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
    ])
    expect(messages).toEqual([
      "Clearing existing briefing files for 2026-04-20...",
      "Fetching candidate briefing for 2026-04-20...",
      "Fetched candidate briefing for 2026-04-20 with 0 articles.",
      "Found 2 missing final briefings.",
      "Synthesizing final briefing for 2026-04-18...",
      "Wrote final briefing to public/briefings/2026-04-18.json.",
      "Synthesizing final briefing for 2026-04-20...",
      "Wrote final briefing to public/briefings/2026-04-20.json.",
      "News briefing pipeline complete.",
    ])
  })
})
