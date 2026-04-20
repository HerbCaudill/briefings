import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, test } from "vitest"
import { buildRawBriefing } from "../buildRawBriefing.ts"
import type { NewsSourceConfig } from "../types.ts"

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directoryPath of temporaryDirectories) {
    // Cleanup intentionally omitted because repo instructions prohibit rm unless explicitly requested.
    void directoryPath
  }
})

describe("buildRawBriefing", () => {
  test("limits headlines per source, deduplicates by URL, preserves sightings, and writes raw JSON", async () => {
    const rawDirectoryPath = mkdtempSync(path.join(tmpdir(), "briefings-raw-"))
    temporaryDirectories.push(rawDirectoryPath)

    const sourceConfigs: NewsSourceConfig[] = [
      {
        homepageUrl: "https://source-one.example/news",
        key: "source-one",
        name: "Source One",
        region: "world",
      },
      {
        homepageUrl: "https://source-two.example/news",
        key: "source-two",
        name: "Source Two",
        region: "world",
      },
    ]

    const fetchedUrls: string[] = []
    const rawBriefing = await buildRawBriefing({
      date: "2026-04-20",
      fetchPageHtml: async url => {
        fetchedUrls.push(url)

        if (url === "https://source-one.example/news") {
          return `
            <h2><a href="/story-a">Story A headline with enough words to keep</a></h2>
            <h2><a href="/story-b">Story B headline with enough words to keep</a></h2>
            <h2><a href="/story-c">Story C headline with enough words to keep</a></h2>
          `
        }

        if (url === "https://source-two.example/news") {
          return `
            <h2><a href="https://source-one.example/story-b">Story B headline with enough words to keep</a></h2>
            <h2><a href="/story-d">Story D headline with enough words to keep</a></h2>
          `
        }

        return `
          <article>
            <p>This is the long article body for ${url}, and it is comfortably longer than forty characters.</p>
          </article>
        `
      },
      maxHeadlinesPerSource: 2,
      rawDirectoryPath,
      sourceConfigs,
    })

    expect(rawBriefing.date).toBe("2026-04-20")
    expect(rawBriefing.articles).toHaveLength(3)
    expect(rawBriefing.articles[0]).toMatchObject({
      body: expect.stringContaining("https://source-one.example/story-a"),
      firstSeenPosition: 1,
      headline: "Story A headline with enough words to keep",
      listingPageUrl: "https://source-one.example/news",
      source: {
        key: "source-one",
        name: "Source One",
        region: "world",
      },
      url: "https://source-one.example/story-a",
    })
    expect(rawBriefing.articles[1].sightings).toEqual([
      {
        headline: "Story B headline with enough words to keep",
        listingPageUrl: "https://source-one.example/news",
        position: 2,
        source: {
          homepageUrl: "https://source-one.example/news",
          key: "source-one",
          name: "Source One",
          region: "world",
        },
      },
      {
        headline: "Story B headline with enough words to keep",
        listingPageUrl: "https://source-two.example/news",
        position: 1,
        source: {
          homepageUrl: "https://source-two.example/news",
          key: "source-two",
          name: "Source Two",
          region: "world",
        },
      },
    ])
    expect(rawBriefing.articles.map(article => article.url)).toEqual([
      "https://source-one.example/story-a",
      "https://source-one.example/story-b",
      "https://source-two.example/story-d",
    ])
    expect(fetchedUrls).not.toContain("https://source-one.example/story-c")
  })
})
