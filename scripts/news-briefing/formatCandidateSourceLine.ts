/** Format a candidate-source status row for the briefing console output. */
export function formatCandidateSourceLine(
  /** The source display name. */
  sourceName: string,
  /** The number of candidates kept from the source. */
  candidateCount: number,
): string {
  const icon = candidateCount > 0 ? "✅" : "❌"
  const count = candidateCount > 0 ? String(candidateCount) : ""

  return `${icon} ${sourceName.padEnd(28)} ${count}`.trimEnd()
}
