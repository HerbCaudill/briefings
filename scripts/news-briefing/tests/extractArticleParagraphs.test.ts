import { describe, expect, test } from "vitest"
import { extractArticleParagraphs } from "../extractArticleParagraphs.ts"

describe("extractArticleParagraphs", () => {
  test("prefers article content and filters out short paragraphs", () => {
    const paragraphs = extractArticleParagraphs(`
      <html>
        <body>
          <p>This outside paragraph is long enough to be ignored because article content exists and should win.</p>
          <article>
            <p>Too short.</p>
            <p>The first article paragraph is long enough to keep, even after tags are removed from the extracted content.</p>
            <p>The second article paragraph is also long enough to keep and should appear on its own output line.</p>
          </article>
        </body>
      </html>
    `)

    expect(paragraphs).toEqual([
      "The first article paragraph is long enough to keep, even after tags are removed from the extracted content.",
      "The second article paragraph is also long enough to keep and should appear on its own output line.",
    ])
  })

  test("stops after the accumulated output crosses the article cap", () => {
    const html = Array.from({ length: 5 }, (_, index) => {
      const label = `Paragraph ${index + 1}`
      return `<p>${label} ${"x".repeat(995 - label.length)}</p>`
    }).join("")

    const paragraphs = extractArticleParagraphs(`<article>${html}</article>`)

    expect(paragraphs).toHaveLength(4)
    expect(paragraphs[3]).toContain("Paragraph 4")
    expect(paragraphs.join("\n")).not.toContain("Paragraph 5")
  })
})
