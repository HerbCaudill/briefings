import { CANDIDATE_COUNT_COLUMN_WIDTH, CANDIDATE_SOURCE_NAME_COLUMN_WIDTH } from "./constants.ts"

/** Format a candidate-source status row for the briefing console output. */
export function formatCandidateSourceLine(
  /** The source display name. */
  sourceName: string,
  /** The number of candidates kept from the source. */
  candidateCount: number,
): string {
  const icon = candidateCount > 0 ? "✅" : "❌"
  const count =
    candidateCount > 0 ? String(candidateCount).padStart(CANDIDATE_COUNT_COLUMN_WIDTH) : ""

  return `${icon} ${sourceName.padEnd(CANDIDATE_SOURCE_NAME_COLUMN_WIDTH)} ${count}`.trimEnd()
}
