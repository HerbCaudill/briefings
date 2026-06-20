/** Compute the calendar day before a YYYY-MM-DD date, returning YYYY-MM-DD. */
export function getPreviousDate(
  /** The briefing date in YYYY-MM-DD form. */
  date: string,
): string {
  const [year, month, day] = date.split("-").map(Number)
  const previous = new Date(Date.UTC(year, month - 1, day - 1))
  const previousYear = previous.getUTCFullYear()
  const previousMonth = String(previous.getUTCMonth() + 1).padStart(2, "0")
  const previousDay = String(previous.getUTCDate()).padStart(2, "0")

  return `${previousYear}-${previousMonth}-${previousDay}`
}
