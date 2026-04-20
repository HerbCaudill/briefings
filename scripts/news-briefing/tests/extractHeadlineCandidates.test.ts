import { describe, expect, test } from "vitest"
import { extractHeadlineCandidates } from "../extractHeadlineCandidates.ts"

describe("extractHeadlineCandidates", () => {
  test("extracts heading links from nested anchors, parent anchors, and aria-label stretched links", () => {
    const candidates = extractHeadlineCandidates(
      "https://example.com/world/",
      `
        <html>
          <body>
            <h2><a href="/story-1">Inside anchor headline with enough words to be kept</a></h2>
            <a href="/story-2"><h3>Parent anchor headline with enough words to be kept</h3></a>
            <a href="/story-3" aria-label="Stretched link headline with enough words to be kept"></a>
            <h3>Stretched link headline with enough words to be kept</h3>
            <h2>Too short</h2>
            <h2><a href="/story-1">Inside anchor headline with enough words to be kept</a></h2>
          </body>
        </html>
      `,
    )

    expect(candidates).toEqual([
      {
        headline: "Inside anchor headline with enough words to be kept",
        position: 1,
        url: "https://example.com/story-1",
      },
      {
        headline: "Parent anchor headline with enough words to be kept",
        position: 2,
        url: "https://example.com/story-2",
      },
      {
        headline: "Stretched link headline with enough words to be kept",
        position: 3,
        url: "https://example.com/story-3",
      },
    ])
  })
})
