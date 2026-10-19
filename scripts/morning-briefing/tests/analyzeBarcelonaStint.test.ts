import { expect, test } from "vitest"

import { analyzeBarcelonaStint } from "../analyzeBarcelonaStint.ts"

const stint = {
  summary: "Herb in Barcelona",
  start: { date: "2026-10-20" },
  end: { date: "2026-10-25" },
  status: "confirmed",
}

test("finds an upcoming all-day Family stint and open Barcelona tasks within seven days", () => {
  expect(
    analyzeBarcelonaStint({
      date: "2026-10-19",
      familyEvents: [stint],
      lynneEvents: [],
      tasks: [
        { id: "a", title: "Book haircut", status: "open", tagId: "01M3Q1JXBVCR1NZE3MQQXHGQ0Z" },
        { id: "b", title: "Old errand", status: "done", tagId: "01M3Q1JXBVCR1NZE3MQQXHGQ0Z" },
        { id: "c", title: "Other errand", status: "open", tagId: "other" },
        {
          id: "d",
          title: "Visit bank",
          status: "open",
          effectiveTag: { id: "01M3Q1JXBVCR1NZE3MQQXHGQ0Z" },
        },
      ],
    }),
  ).toMatchObject({
    status: "planned",
    stint: { start: "2026-10-20", endInclusive: "2026-10-24" },
    tasks: [
      { title: "Book haircut", url: "https://tasks.herbcaudill.com/?task=a" },
      { title: "Visit bank", url: "https://tasks.herbcaudill.com/?task=d" },
    ],
  })
})

test("an ongoing stint counts and a timed or cancelled lookalike does not", () => {
  const result = analyzeBarcelonaStint({
    date: "2026-10-22",
    familyEvents: [
      { ...stint, status: "cancelled" },
      { ...stint, start: { dateTime: "2026-10-22T12:00:00+02:00" } },
      stint,
    ],
    lynneEvents: [],
    tasks: [],
  })
  expect(result.status).toBe("planned")
  expect(result.tasks).toEqual([])
})

test("does not infer Lynne's location from therapy, video calls, or a city trip elsewhere", () => {
  const result = analyzeBarcelonaStint({
    date: "2026-10-26",
    familyEvents: [],
    lynneEvents: [
      { summary: "Therapy", start: { dateTime: "2026-10-28T18:00:00+01:00" } },
      { summary: "Video call", location: "Zoom", start: { dateTime: "2026-10-29T18:00:00+01:00" } },
      { summary: "DC", start: { date: "2026-10-30" }, end: { date: "2026-11-02" } },
    ],
    tasks: [],
  })
  expect(result).toMatchObject({
    status: "missing",
    suggestions: [],
    locationEvidence: "insufficient",
  })
})

test("proposes three or four day windows only around explicit Barcelona evidence", () => {
  const result = analyzeBarcelonaStint({
    date: "2026-10-26",
    familyEvents: [],
    lynneEvents: [
      {
        summary: "Barcelona",
        status: "confirmed",
        start: { date: "2026-11-04" },
        end: { date: "2026-11-08" },
      },
      {
        summary: "Tamariu",
        status: "confirmed",
        start: { date: "2026-11-06" },
        end: { date: "2026-11-07" },
      },
    ],
    tasks: [],
  })
  expect(result.status).toBe("missing")
  expect(result.suggestions.length).toBeGreaterThan(0)
  expect(result.suggestions.every(window => window.days >= 3 && window.days <= 4)).toBe(true)
  expect(result.suggestions.every(window => window.overlapDates.length > 0)).toBe(true)
  expect(result.suggestions.every(window => !window.overlapDates.includes("2026-11-06"))).toBe(true)
})

test("an inaccessible Family calendar cannot establish that no stint is planned", () => {
  expect(
    analyzeBarcelonaStint({ date: "2026-10-19", familyEvents: null, lynneEvents: [], tasks: [] }),
  ).toMatchObject({ status: "unknown", suggestions: [] })
})

test("a stint starting after three weeks does not suppress the planning nudge", () => {
  expect(
    analyzeBarcelonaStint({
      date: "2026-10-19",
      familyEvents: [{ ...stint, start: { date: "2026-11-10" }, end: { date: "2026-11-14" } }],
      lynneEvents: [],
      tasks: [],
    }).status,
  ).toBe("missing")
})
