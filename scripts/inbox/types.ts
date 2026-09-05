/** Original dictated capture with a stable identity for retry recovery. */
export type Capture = {
  /** Hash of the original timestamp and wording. */
  id: string
  /** Original timestamp. */
  timestamp: string
  /** Original text, without surrounding line breaks. */
  raw: string
}

/** Classification only; external actions are performed by the processor. */
export type CaptureDraft = {
  /** Concise action or outcome. */
  title: string
  /** Unresolved question to surface during review. */
  question: string
  /** Research scope, or empty when no research is useful. */
  research: string
  /** An existing incomplete task for the same action, if unambiguous. */
  duplicate: { id: string; listId: string } | null
}

/** Verified Google Tasks destination. */
export type CaptureTarget = {
  /** Task identifier. */
  id: string
  /** Current list identifier. */
  listId: string
  /** Current title. */
  title: string
  /** Link to the task. */
  url: string
}

/** Durable transfer journal, also used as the research queue. */
export type CaptureRecord = {
  /** Source capture. */
  capture: Capture
  /** Classification saved before creating a task. */
  draft: CaptureDraft
  /** Insertion intent persisted before the remote write. */
  insertionAttempted?: boolean
  /** Returned destination persisted before read-back verification. */
  candidate?: CaptureTarget
  /** Destination recorded only after read-back verification. */
  target?: CaptureTarget
  /** Local processing date for the archive heading. */
  date: string
}

/** Google Task fields needed for transfer and verification. */
export type GoogleTask = {
  /** Task identifier. */
  id: string
  /** Title. */
  title: string
  /** Operational context. */
  notes?: string
  /** Completion state. */
  status?: string
  /** Whether the task was deleted. */
  deleted?: boolean
  /** Google-provided browser link. */
  webViewLink?: string
  /** Parent identifier for a subtask. */
  parent?: string
  /** Lexicographic order among siblings. */
  position?: string
}

/** Structured API request. */
export type GwsRequest = {
  /** Query and path parameters. */
  params?: Record<string, string | number | boolean>
  /** Fields to insert or patch. */
  body?: Record<string, string>
}

/** Injectable API boundary. */
export type GwsRunner = (command: readonly string[], request: GwsRequest) => Promise<unknown>
