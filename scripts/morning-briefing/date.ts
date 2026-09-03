/** Format a date as YYYY-MM-DD in Europe/Madrid. */
export function formatMadridDate(
  /** Instant to format. */
  date: Date = new Date(),
): string {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Madrid",
    year: "numeric",
  }).format(date)
}

/** Format a human-readable date in Europe/Madrid. */
export function formatMadridDisplayDate(
  /** Instant to format. */
  date: Date = new Date(),
): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "Europe/Madrid",
  }).format(date)
}

/** Build a filesystem-safe timestamp for a run directory. */
export function formatRunId(
  /** Instant to format. */
  date: Date = new Date(),
): string {
  return date.toISOString().replaceAll(":", "-").replace(".", "-")
}
