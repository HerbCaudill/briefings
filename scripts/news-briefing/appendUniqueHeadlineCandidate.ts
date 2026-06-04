import type { HeadlineCandidate, HeadlineCandidateState } from "./types.ts"

/** Append a headline candidate while recording the headline in a new dedupe state. */
export function appendUniqueHeadlineCandidate(
  /** The existing candidate state. */
  state: HeadlineCandidateState,
  /** The candidate to append. */
  candidate: HeadlineCandidate,
): HeadlineCandidateState {
  return {
    candidates: [...state.candidates, candidate],
    seenHeadlines: new Set([...state.seenHeadlines, candidate.headline]),
  }
}
