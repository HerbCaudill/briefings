import { describe, expect, test } from "vitest"
import { hydrateSelectedStories } from "../hydrateSelectedStories.ts"
import type { BriefingSelection, RawBriefing } from "../types.ts"

describe("hydrateSelectedStories", () => {
  test("fetches and adds full article bodies only for selected source urls", async () => {
    const fetchedUrls: string[] = []
    const hydratedSelection = await hydrateSelectedStories(rawBriefing, selection, async url => {
      fetchedUrls.push(url)
      return `<article><p>The fetched selected story body is long enough to keep as article text.</p></article>`
    })

    expect(fetchedUrls).toEqual(["https://bbc.example/ceasefire"])
    expect(hydratedSelection).toEqual({
      date: "2026-06-04",
      stories: [
        {
          headline: "Ceasefire story",
          section: "World",
          sources: [
            {
              body: "The fetched selected story body is long enough to keep as article text.",
              headline: "Israel and Lebanon agree to implement ceasefire",
              source: "BBC News",
              url: "https://bbc.example/ceasefire",
            },
          ],
        },
      ],
    })
  })
})

const rawBriefing: RawBriefing = {
  articles: [
    {
      headline: "Israel and Lebanon agree to implement ceasefire",
      region: "world",
      source: "BBC News",
      url: "https://bbc.example/ceasefire",
    },
    {
      headline: "Celebrity birthday story",
      region: "world",
      source: "BBC News",
      url: "https://bbc.example/celebrity",
    },
  ],
  date: "2026-06-04",
}

const selection: BriefingSelection = {
  stories: [
    {
      headline: "Ceasefire story",
      section: "World",
      sourceUrls: ["https://bbc.example/ceasefire"],
    },
  ],
}
