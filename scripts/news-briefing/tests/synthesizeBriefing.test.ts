import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { describe, expect, test } from "vitest"
import { synthesizeBriefing } from "../synthesizeBriefing.ts"

describe("synthesizeBriefing", () => {
  test("selects stories from compact metadata, hydrates them, and writes the final briefing JSON", async () => {
    const rootDirectoryPath = mkdtempSync(path.join(tmpdir(), "briefings-synthesize-"))
    const rawDirectoryPath = path.join(rootDirectoryPath, "public/briefings/raw")
    const briefingDirectoryPath = path.join(rootDirectoryPath, "public/briefings")

    mkdirSync(rawDirectoryPath, { recursive: true })
    mkdirSync(briefingDirectoryPath, { recursive: true })

    writeFileSync(
      path.join(rawDirectoryPath, "2026-04-20.json"),
      JSON.stringify(
        {
          articles: [
            {
              body: "",
              firstSeenPosition: 1,
              headline: "Selected story",
              listingPageUrl: "https://source.example/news",
              sightings: [{ headline: "Selected duplicate" }],
              source: { name: "Source", region: "world" },
              url: "https://source.example/selected",
            },
            {
              body: "",
              firstSeenPosition: 2,
              headline: "Omitted story",
              listingPageUrl: "https://source.example/news",
              sightings: [],
              source: { name: "Source", region: "world" },
              url: "https://source.example/omitted",
            },
          ],
          date: "2026-04-20",
        },
        null,
        2,
      ),
    )

    const calls: Array<{ prompt: string; rawBriefingPath: string }> = []

    const briefingPath = await synthesizeBriefing({
      briefingDirectoryPath,
      date: "2026-04-20",
      fetchPageHtml: async url => {
        if (url === "https://source.example/selected") {
          return `<article><p>Long selected article body fetched after selection.</p></article>`
        }

        throw new Error(`Unexpected article fetch: ${url}`)
      },
      rawDirectoryPath,
      runPi: async args => {
        calls.push(args)

        if (calls.length === 1) {
          const selectionInput = JSON.parse(readFileSync(args.rawBriefingPath, "utf8"))
          expect(JSON.stringify(selectionInput)).not.toContain("Long selected article body")
          expect(JSON.stringify(selectionInput)).not.toContain("sightings")

          return JSON.stringify({
            stories: [
              {
                headline: "Selected story",
                section: "World",
                sourceUrls: ["https://source.example/selected"],
              },
            ],
          })
        }

        const hydratedInput = JSON.parse(readFileSync(args.rawBriefingPath, "utf8"))
        expect(JSON.stringify(hydratedInput)).toContain(
          "Long selected article body fetched after selection",
        )
        expect(JSON.stringify(hydratedInput)).not.toContain("https://source.example/omitted")

        return JSON.stringify({ sections: [{ title: "World", stories: [] }] }, null, 2)
      },
    })

    expect(calls).toHaveLength(2)
    expect(calls[0].prompt).toContain("Select the strongest stories")
    expect(calls[1].prompt).toContain("Use the selected hydrated stories")
    expect(briefingPath).toBe(path.join(briefingDirectoryPath, "2026-04-20.json"))
    expect(JSON.parse(readFileSync(briefingPath, "utf8"))).toEqual({
      sections: [{ title: "World", stories: [] }],
    })
  })
})
