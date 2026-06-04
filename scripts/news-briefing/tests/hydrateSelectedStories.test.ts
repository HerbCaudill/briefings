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
      body: "",
      firstSeenPosition: 1,
      headline: "Israel and Lebanon agree to implement ceasefire",
      listingPageUrl: "https://bbc.example/news",
      sightings: [],
      source: {
        homepageUrl: "https://bbc.example/news",
        key: "bbc",
        name: "BBC News",
        region: "world",
      },
      url: "https://bbc.example/ceasefire",
    },
    {
      body: "The omitted story body should not appear.",
      firstSeenPosition: 2,
      headline: "Celebrity birthday story",
      listingPageUrl: "https://bbc.example/news",
      sightings: [],
      source: {
        homepageUrl: "https://bbc.example/news",
        key: "bbc",
        name: "BBC News",
        region: "world",
      },
      url: "https://bbc.example/celebrity",
    },
  ],
  createdAt: "2026-06-04T00:00:00.000Z",
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
