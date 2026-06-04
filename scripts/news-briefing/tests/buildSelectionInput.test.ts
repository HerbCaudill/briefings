import { describe, expect, test } from "vitest"
import { buildSelectionInput } from "../buildSelectionInput.ts"
import type { RawBriefing } from "../types.ts"

describe("buildSelectionInput", () => {
  test("keeps only headline, url, source, region, and first seen position for each article", () => {
    const selectionInput = buildSelectionInput(rawBriefing)

    expect(selectionInput).toEqual({
      articles: [
        {
          firstSeenPosition: 1,
          headline: "Major world headline",
          source: "Source One",
          region: "world",
          url: "https://source.example/world",
        },
      ],
      date: "2026-06-04",
    })
  })
})

const rawBriefing: RawBriefing = {
  articles: [
    {
      body: "Long article body that should not be included in the selection input.",
      firstSeenPosition: 1,
      headline: "Major world headline",
      listingPageUrl: "https://source.example/news",
      sightings: [
        {
          headline: "Duplicate headline",
          listingPageUrl: "https://source.example/news",
          position: 1,
          source: {
            homepageUrl: "https://source.example",
            key: "source-one",
            name: "Source One",
            region: "world",
          },
        },
      ],
      source: {
        homepageUrl: "https://source.example",
        key: "source-one",
        name: "Source One",
        region: "world",
      },
      url: "https://source.example/world",
    },
  ],
  createdAt: "2026-06-04T00:00:00.000Z",
  date: "2026-06-04",
}
