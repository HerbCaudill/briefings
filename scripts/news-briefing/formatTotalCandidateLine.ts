import { CANDIDATE_COUNT_COLUMN_WIDTH, CANDIDATE_SOURCE_NAME_COLUMN_WIDTH } from "./constants.ts"

/** Format the total candidate count row to align with source count rows. */
export function formatTotalCandidateLine(
  /** The total number of candidates kept from all sources. */
  candidateCount: number,
): string {
  const statusPrefix = "   "
  const count = String(candidateCount).padStart(CANDIDATE_COUNT_COLUMN_WIDTH)

  return `${statusPrefix}${"Total candidates".padEnd(CANDIDATE_SOURCE_NAME_COLUMN_WIDTH)} ${count}`
}
