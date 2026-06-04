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

  test("logs concise timed stages around the pipeline", async () => {
    const messages: string[] = []
    const times = [0, 0, 1000, 1000, 3000, 7000]

    await runNewsBriefingPipeline({
      clearExistingBriefingFiles: async () => {},
      commitAndPushGeneratedBriefings: async () => {},
      date: "2026-04-20",
      listMissingBriefingDates: () => ["2026-04-20"],
      log: message => messages.push(message),
      now: () => times.shift() ?? 7000,
      runFetchStage: async date => ({
        articles: [
          {
            headline: "Story",
            region: "world",
            source: "Source",
            url: "https://source.example/story",
          },
        ],
        date,
      }),
      runSynthesisStage: async () => "public/briefings/2026-04-20.json",
    })

    expect(messages).toEqual([
      "Clearing existing briefing files for 2026-04-20...",
      "done (1s)",
      "",
      "Fetching candidates...",
      "",
      "-------------------------",
      "Total candidates      1",
      "",
      "done (2s)",
      "",
      "Briefing complete (7s)",
    ])
  })
})
