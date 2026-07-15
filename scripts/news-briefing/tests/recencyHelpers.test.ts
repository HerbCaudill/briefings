import { describe, expect, test } from "vitest"
import { isStaleArticleDate } from "../isStaleArticleDate.ts"
import { parseRssItemDate } from "../parseRssItemDate.ts"

describe("parseRssItemDate", () => {
  test("parses RFC 2822 pubDate text into a YYYY-MM-DD date", () => {
    expect(parseRssItemDate("Thu, 04 Jun 2026 14:40:48 GMT")).toBe("2026-06-04")
  })

  test("parses CDATA-wrapped pubDate text", () => {
    expect(parseRssItemDate("<![CDATA[Sat, 11 Jul 2026 09:43:26 GMT]]>")).toBe("2026-07-11")
  })

  test("returns undefined for empty or unparseable text", () => {
    expect(parseRssItemDate("")).toBeUndefined()
    expect(parseRssItemDate("not a date")).toBeUndefined()
  })
})

describe("isStaleArticleDate", () => {
  test("flags articles older than the allowed age before the briefing date", () => {
    expect(
      isStaleArticleDate({ articleDate: "2026-06-04", briefingDate: "2026-07-12", maxAgeDays: 2 }),
    ).toBe(true)
    expect(
      isStaleArticleDate({ articleDate: "2026-07-09", briefingDate: "2026-07-12", maxAgeDays: 2 }),
    ).toBe(true)
  })

  test("keeps articles within the allowed age window", () => {
    expect(
      isStaleArticleDate({ articleDate: "2026-07-10", briefingDate: "2026-07-12", maxAgeDays: 2 }),
    ).toBe(false)
    expect(
      isStaleArticleDate({ articleDate: "2026-07-12", briefingDate: "2026-07-12", maxAgeDays: 2 }),
    ).toBe(false)
  })

  test("treats unparseable dates as not stale", () => {
    expect(
      isStaleArticleDate({ articleDate: "unknown", briefingDate: "2026-07-12", maxAgeDays: 2 }),
    ).toBe(false)
    expect(
      isStaleArticleDate({ articleDate: "2026-07-10", briefingDate: "unknown", maxAgeDays: 2 }),
    ).toBe(false)
  })
})
