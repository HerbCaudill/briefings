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
  test("limits headlines per source, deduplicates by URL, and writes candidate JSON", async () => {
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
    expect(rawBriefing.articles[0]).toEqual({
      firstSeenPosition: 1,
      headline: "Story A headline with enough words to keep",
      region: "world",
      source: "Source One",
      url: "https://source-one.example/story-a",
    })
    expect(rawBriefing.articles.map(article => article.url)).toEqual([
      "https://source-one.example/story-a",
      "https://source-one.example/story-b",
      "https://source-two.example/story-d",
    ])
    expect(fetchedUrls).not.toContain("https://source-one.example/story-c")
  })

  test("logs source and article-fetch progress", async () => {
    const rawDirectoryPath = mkdtempSync(path.join(tmpdir(), "briefings-raw-"))
    temporaryDirectories.push(rawDirectoryPath)

    const messages: string[] = []

    await buildRawBriefing({
      date: "2026-04-22",
      fetchPageHtml: async url => {
        if (url === "https://source.example/news") {
          return `
            <h2><a href="/story-a">Story A headline with enough words to keep</a></h2>
            <h2><a href="/story-b">Story B headline with enough words to keep</a></h2>
          `
        }

        return `
          <article>
            <p>This article body is comfortably longer than forty characters and should be kept.</p>
          </article>
        `
      },
      log: message => messages.push(message),
      rawDirectoryPath,
      sourceConfigs: [
        {
          homepageUrl: "https://source.example/news",
          key: "source",
          name: "Source",
          region: "world",
        },
      ],
    })

    expect(messages).toEqual([
      "Fetching homepage for Source...",
      "Found 2 headline candidates for Source; using 2.",
      "Kept 2 candidate articles for selection.",
      `Wrote candidate briefing to ${path.join(rawDirectoryPath, "2026-04-22.json")}.`,
    ])
  })

  test("skips source homepages that fail to fetch", async () => {
    const rawDirectoryPath = mkdtempSync(path.join(tmpdir(), "briefings-raw-"))
    temporaryDirectories.push(rawDirectoryPath)

    const rawBriefing = await buildRawBriefing({
      date: "2026-04-22",
      fetchPageHtml: async url => {
        if (url === "https://broken-source.example/news") {
          throw new Error("homepage failed")
        }

        if (url === "https://working-source.example/news") {
          return `
            <h2><a href="/story-success">Successful story headline with enough words to keep</a></h2>
          `
        }

        return `
          <article>
            <p>This article body is comfortably longer than forty characters and should be kept.</p>
          </article>
        `
      },
      rawDirectoryPath,
      sourceConfigs: [
        {
          homepageUrl: "https://broken-source.example/news",
          key: "broken-source",
          name: "Broken Source",
          region: "world",
        },
        {
          homepageUrl: "https://working-source.example/news",
          key: "working-source",
          name: "Working Source",
          region: "world",
        },
      ],
    })

    expect(rawBriefing.articles.map(article => article.url)).toEqual([
      "https://working-source.example/story-success",
    ])
  })

  test("uses fallback listing pages when primary pages have too few candidates", async () => {
    const rawDirectoryPath = mkdtempSync(path.join(tmpdir(), "briefings-raw-"))
    temporaryDirectories.push(rawDirectoryPath)

    const fetchedUrls: string[] = []
    const rawBriefing = await buildRawBriefing({
      date: "2026-04-23",
      fetchPageHtml: async url => {
        fetchedUrls.push(url)

        if (url === "https://blocked-source.example/news") {
          return `<h2><a href="/thin-story">Only primary headline with enough words</a></h2>`
        }

        if (url === "https://blocked-source.example/rss") {
          return `
            <rss>
              <channel>
                <item>
                  <title>Fallback RSS headline with enough words to keep</title>
                  <link>https://blocked-source.example/story-from-rss</link>
                  <description>RSS description body that is comfortably longer than forty characters and should be kept.</description>
                </item>
              </channel>
            </rss>
          `
        }

        if (url === "https://blocked-source.example/story-from-rss") {
          throw new Error("article blocked")
        }

        return `
          <article>
            <p>This fallback article body is comfortably longer than forty characters and should be kept.</p>
          </article>
        `
      },
      rawDirectoryPath,
      sourceConfigs: [
        {
          fallbackUrls: ["https://blocked-source.example/rss"],
          homepageUrl: "https://blocked-source.example/news",
          key: "blocked-source",
          name: "Blocked Source",
          region: "world",
        },
      ],
    })

    expect(fetchedUrls).toContain("https://blocked-source.example/rss")
    expect(rawBriefing.articles.map(article => article.url)).not.toContain(
      "https://blocked-source.example/thin-story",
    )
    expect(rawBriefing.articles[0]).toEqual({
      firstSeenPosition: 1,
      headline: "Fallback RSS headline with enough words to keep",
      region: "world",
      source: "Blocked Source",
      url: "https://blocked-source.example/story-from-rss",
    })
  })

  test("can prefer fallback listing pages over primary pages", async () => {
    const rawDirectoryPath = mkdtempSync(path.join(tmpdir(), "briefings-raw-"))
    temporaryDirectories.push(rawDirectoryPath)

    const fetchedUrls: string[] = []
    const rawBriefing = await buildRawBriefing({
      date: "2026-04-24",
      fetchPageHtml: async url => {
        fetchedUrls.push(url)

        if (url === "https://source.example/feed") {
          return `
            <rss>
              <channel>
                <item>
                  <title>Preferred feed headline with enough words to keep</title>
                  <link>https://source.example/feed-story</link>
                  <description>Preferred feed body that is comfortably longer than forty characters and should be kept.</description>
                </item>
              </channel>
            </rss>
          `
        }

        return `<h2><a href="/primary-story">Primary homepage headline with enough words to keep</a></h2>`
      },
      rawDirectoryPath,
      sourceConfigs: [
        {
          fallbackUrls: ["https://source.example/feed"],
          homepageUrl: "https://source.example/news",
          key: "source",
          name: "Source",
          preferFallbackUrls: true,
          region: "world",
        },
      ],
    })

    expect(fetchedUrls[0]).toBe("https://source.example/feed")
    expect(rawBriefing.articles.map(article => article.url)).toEqual([
      "https://source.example/feed-story",
    ])
  })

  test("keeps all candidate article records without fetching their bodies", async () => {
    const rawDirectoryPath = mkdtempSync(path.join(tmpdir(), "briefings-raw-"))
    temporaryDirectories.push(rawDirectoryPath)

    const attemptsByUrl = new Map<string, number>()
    const rawBriefing = await buildRawBriefing({
      date: "2026-04-21",
      fetchPageHtml: async url => {
        attemptsByUrl.set(url, (attemptsByUrl.get(url) ?? 0) + 1)

        if (url === "https://source.example/news") {
          return `
            <h2><a href="/story-success">Successful story headline with enough words to keep</a></h2>
            <h2><a href="/story-retry">Retry story headline with enough words to keep</a></h2>
            <h2><a href="/story-fail">Failed story headline with enough words to keep</a></h2>
            <h2><a href="/story-empty">Empty story headline with enough words to keep</a></h2>
          `
        }

        if (url === "https://source.example/story-success") {
          return `
            <article>
              <p>This successful article body is comfortably longer than forty characters and should be kept.</p>
            </article>
          `
        }

        if (url === "https://source.example/story-retry") {
          if ((attemptsByUrl.get(url) ?? 0) < 2) {
            throw new Error("temporary failure")
          }

          return `
            <article>
              <p>This retried article body is comfortably longer than forty characters and should be kept.</p>
            </article>
          `
        }

        if (url === "https://source.example/story-fail") {
          throw new Error("permanent failure")
        }

        return `
          <article>
            <p>Too short.</p>
          </article>
        `
      },
      rawDirectoryPath,
      sourceConfigs: [
        {
          homepageUrl: "https://source.example/news",
          key: "source",
          name: "Source",
          region: "world",
        },
      ],
    })

    expect(rawBriefing.articles.map(article => article.url)).toEqual([
      "https://source.example/story-success",
      "https://source.example/story-retry",
      "https://source.example/story-fail",
      "https://source.example/story-empty",
    ])
    expect(rawBriefing.articles.every(article => !("body" in article))).toBe(true)
    expect(attemptsByUrl.get("https://source.example/story-retry")).toBeUndefined()
    expect(attemptsByUrl.get("https://source.example/story-fail")).toBeUndefined()
    expect(attemptsByUrl.get("https://source.example/story-empty")).toBeUndefined()
  })
})
