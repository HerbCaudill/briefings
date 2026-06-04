import { describe, expect, test } from "vitest"
import { appendUniqueHeadlineCandidate } from "../appendUniqueHeadlineCandidate.ts"
import { createHeadlineCandidate } from "../createHeadlineCandidate.ts"
import { isUsableHeadlineCandidate } from "../isUsableHeadlineCandidate.ts"
import type { HeadlineCandidateState } from "../types.ts"

describe("headline candidate helpers", () => {
  test("creates a candidate from a valid HTTP article URL", () => {
    expect(
      createHeadlineCandidate({
        baseUrl: "https://example.com/world/",
        body: "Source body text that is long enough to preserve for RSS articles",
        headline: "Story headline with enough words to keep",
        href: "/news/story-one",
        position: 2,
      }),
    ).toEqual({
      body: "Source body text that is long enough to preserve for RSS articles",
      headline: "Story headline with enough words to keep",
      position: 2,
      url: "https://example.com/news/story-one",
    })
  })

  test("returns null when the candidate URL is not an HTTP article URL", () => {
    expect(
      createHeadlineCandidate({
        baseUrl: "https://example.com/",
        headline: "Story headline with enough words to keep",
        href: "mailto:newsroom@example.com",
        position: 1,
      }),
    ).toBeNull()
  })

  test("checks headline length, generic text, and duplicates", () => {
    const seenHeadlines = new Set(["Already seen headline with enough words"])

    expect(
      isUsableHeadlineCandidate({
        headline: "New story headline with enough words",
        minimumLength: 15,
        rejectGenericHeadline: true,
        seenHeadlines,
      }),
    ).toBe(true)
    expect(
      isUsableHeadlineCandidate({
        headline: "Too short",
        minimumLength: 15,
        rejectGenericHeadline: true,
        seenHeadlines,
      }),
    ).toBe(false)
    expect(
      isUsableHeadlineCandidate({
        headline: "WASHINGTON & POLITICS",
        minimumLength: 15,
        rejectGenericHeadline: true,
        seenHeadlines,
      }),
    ).toBe(false)
    expect(
      isUsableHeadlineCandidate({
        headline: "Already seen headline with enough words",
        minimumLength: 15,
        rejectGenericHeadline: true,
        seenHeadlines,
      }),
    ).toBe(false)
  })

  test("appends a candidate and records its headline without mutating state", () => {
    const state: HeadlineCandidateState = {
      candidates: [],
      seenHeadlines: new Set<string>(),
    }
    const candidate = {
      headline: "Story headline with enough words to keep",
      position: 1,
      url: "https://example.com/news/story-one",
    }

    const nextState = appendUniqueHeadlineCandidate(state, candidate)

    expect(nextState).toEqual({
      candidates: [candidate],
      seenHeadlines: new Set(["Story headline with enough words to keep"]),
    })
    expect(state).toEqual({ candidates: [], seenHeadlines: new Set<string>() })
  })
})
