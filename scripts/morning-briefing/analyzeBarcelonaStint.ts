const BARCELONA_TAG_ID = "01M3Q1JXBVCR1NZE3MQQXHGQ0Z"
const DAY_MS = 86_400_000

/** Check planned stints, explicitly located Lynne days, and tagged open tasks. */
export function analyzeBarcelonaStint(
  /** Local date and complete read-only source results; null means unavailable. */
  input: BarcelonaStintInput,
): BarcelonaStintResult {
  if (input.familyEvents === null)
    return { status: "unknown", suggestions: [], tasks: [], locationEvidence: "unknown" }

  const horizon = addDays(input.date, 21)
  const stint = input.familyEvents
    .filter(event => event.status !== "cancelled" && event.summary?.trim() === "Herb in Barcelona")
    .filter(event => event.start?.date && event.end?.date)
    .map(event => ({ start: event.start!.date!, endInclusive: addDays(event.end!.date!, -1) }))
    .filter(event => event.start <= horizon && event.endInclusive >= input.date)
    .sort((a, b) => a.start.localeCompare(b.start))[0]

  if (stint) {
    const startsSoon = stint.start >= input.date && stint.start <= addDays(input.date, 7)
    const tasks = startsSoon
      ? (input.tasks
          ?.filter(
            task =>
              task.status === "open" &&
              !task.deleted &&
              (task.tagId === BARCELONA_TAG_ID || task.effectiveTag?.id === BARCELONA_TAG_ID),
          )
          .map(task => ({
            title: task.title,
            url: `https://tasks.herbcaudill.com/?task=${task.id}`,
          })) ?? null)
      : []
    return { status: "planned", stint, suggestions: [], tasks, locationEvidence: "not needed" }
  }

  if (input.lynneEvents === null)
    return { status: "missing", suggestions: [], tasks: [], locationEvidence: "unknown" }

  const barcelona = new Set<string>()
  const elsewhere = new Set<string>()
  for (const event of input.lynneEvents) {
    if (event.status !== "confirmed" || !event.start?.date || !event.end?.date) continue
    const title = event.summary?.trim().toLocaleLowerCase()
    const destination =
      title === "barcelona" || title === "lynne in barcelona"
        ? barcelona
        : title === "tamariu" || title === "lynne in tamariu"
          ? elsewhere
          : null
    if (!destination) continue
    for (let day = event.start.date; day < event.end.date; day = addDays(day, 1))
      destination.add(day)
  }
  const knownDays = [...barcelona].filter(
    day => !elsewhere.has(day) && day >= input.date && day <= horizon,
  )
  const candidates: BarcelonaWindow[] = []
  for (let offset = 0; offset < 21; offset += 1) {
    const start = addDays(input.date, offset)
    for (const days of [3, 4]) {
      const endInclusive = addDays(start, days - 1)
      if (endInclusive > horizon) continue
      const overlapDates = knownDays.filter(day => day >= start && day <= endInclusive).sort()
      if (overlapDates.length) candidates.push({ start, endInclusive, days, overlapDates })
    }
  }
  candidates.sort(
    (a, b) =>
      b.overlapDates.length - a.overlapDates.length ||
      a.start.localeCompare(b.start) ||
      a.days - b.days,
  )
  const suggestions: BarcelonaWindow[] = []
  for (const candidate of candidates) {
    if (
      suggestions.some(window =>
        window.overlapDates.some(day => candidate.overlapDates.includes(day)),
      )
    )
      continue
    suggestions.push(candidate)
    if (suggestions.length === 2) break
  }
  return {
    status: "missing",
    suggestions,
    tasks: [],
    locationEvidence: knownDays.length ? "explicit Barcelona all-day event" : "insufficient",
  }
}

/** Add calendar days without using the machine's time zone or DST rules. */
function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)
}

// TYPES

export type BarcelonaStintInput = {
  /** Briefing date in Europe/Madrid. */
  date: string
  /** All Family events overlapping today through the next 21 days. */
  familyEvents: readonly CalendarEvent[] | null
  /** Lynne's events over the same horizon. */
  lynneEvents: readonly CalendarEvent[] | null
  /** Complete Tasks list, or null when its query was incomplete. */
  tasks: readonly TaggedTask[] | null
}

export type BarcelonaStintResult = {
  status: "planned" | "missing" | "unknown"
  stint?: { start: string; endInclusive: string }
  suggestions: BarcelonaWindow[]
  tasks: { title: string; url: string }[] | null
  locationEvidence: "not needed" | "unknown" | "insufficient" | "explicit Barcelona all-day event"
}

type BarcelonaWindow = {
  start: string
  endInclusive: string
  days: number
  overlapDates: string[]
}

type CalendarEvent = {
  summary?: string
  location?: string
  start?: { date?: string; dateTime?: string }
  end?: { date?: string; dateTime?: string }
  status?: string
}

type TaggedTask = {
  id: string
  title: string
  status?: string
  tagId?: string | null
  effectiveTag?: { id: string } | null
  deleted?: boolean
}
