/** Format a briefing date as a display title. */
export function formatBriefingTitle(
  /** The ISO date string for the briefing. */
  dateString: string,
): string {
  const date = new Date(`${dateString}T12:00:00`)
  const formattedDate = date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  })

  return `Daily Briefing — ${formattedDate}`
}
