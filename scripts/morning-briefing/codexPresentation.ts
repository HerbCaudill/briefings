import { spawn } from "node:child_process"
import { randomUUID } from "node:crypto"
import readline from "node:readline"

import { writeTextAtomically } from "./atomicWrite.ts"
import {
  BRIEFINGS_REPOSITORY_PATH,
  CODEX_COMMAND_PATH,
  MORNING_BRIEFING_MODEL,
} from "./constants.ts"
import { readMorningBriefingPrompt } from "./readPromptFile.ts"

const PRESENTATION_TIMEOUT_MS = 45 * 60 * 1_000
const CLEANUP_TIMEOUT_MS = 10_000
const FORCE_KILL_DELAY_MS = 1_000

/** Build the request that creates a persistent clean presentation task. */
export function getMorningBriefingPresentationThreadStartRequest(
  threadSource = "morning-briefing",
) {
  return {
    method: "thread/start",
    id: 1,
    params: {
      approvalPolicy: "never",
      cwd: BRIEFINGS_REPOSITORY_PATH,
      ephemeral: false,
      model: MORNING_BRIEFING_MODEL,
      sandbox: "danger-full-access",
      threadSource,
    },
  } as const
}

/** Build the App Server initialization request. */
export function getMorningBriefingInitializeRequest() {
  return {
    method: "initialize",
    id: 0,
    params: {
      capabilities: null,
      clientInfo: {
        name: "codex_cli_rs",
        title: "Morning Briefing Presenter",
        version: "1.0.0",
      },
    },
  } as const
}

/** Build the request that discovers sidebar sections without a profile-specific ID. */
export function getMorningBriefingThreadSectionListRequest(id: number, cursor?: string) {
  return {
    method: "threadSection/list",
    id,
    params: { ...(cursor ? { cursor } : {}), limit: 100 },
  } as const
}

/** Build the exact-echo presentation turn request. */
export function getMorningBriefingPresentationTurnStartRequest(
  threadId: string,
  dailyNotePath: string,
) {
  const prompt = `${readMorningBriefingPrompt("presentation.prompt.md")}

## Run context

- Daily note path: ${dailyNotePath}
`

  return {
    method: "turn/start",
    id: 3,
    params: {
      approvalPolicy: "never",
      cwd: BRIEFINGS_REPOSITORY_PATH,
      effort: "low",
      input: [{ type: "text", text: prompt }],
      model: MORNING_BRIEFING_MODEL,
      sandboxPolicy: { type: "dangerFullAccess" },
      threadId,
    },
  } as const
}

/** Build the request that pins the clean presentation task. */
export function getMorningBriefingPinRequest(threadId: string, sectionId = "pinned") {
  return {
    method: "thread/section/move",
    id: 5,
    params: { sectionId, threadId },
  } as const
}

/** Build a paged request for tasks in the discovered pinned section. */
export function getMorningBriefingPinnedThreadsRequest(
  id: number,
  sectionId: string,
  cursor?: string,
) {
  return {
    method: "thread/list",
    id,
    params: {
      ...(cursor ? { cursor } : {}),
      limit: 100,
      sectionId,
      useStateDbOnly: true,
    },
  } as const
}

/** Build a request that moves an older presentation out of Pinned. */
export function getMorningBriefingUnpinRequest(threadId: string, id: number) {
  return {
    method: "thread/section/move",
    id,
    params: { sectionId: null, threadId },
  } as const
}

/** Build a request that archives a failed presentation task. */
export function getMorningBriefingArchiveRequest(threadId: string, id: number) {
  return {
    method: "thread/archive",
    id,
    params: { threadId },
  } as const
}

/** Build a request that can rediscover a task whose start response was lost. */
export function getMorningBriefingRecoveryThreadsRequest(id: number, cursor?: string) {
  return {
    method: "thread/list",
    id,
    params: {
      ...(cursor ? { cursor } : {}),
      cwd: BRIEFINGS_REPOSITORY_PATH,
      limit: 100,
      sortDirection: "desc",
      sortKey: "created_at",
      sourceKinds: ["appServer"],
      useStateDbOnly: true,
    },
  } as const
}

/** Find the task tagged with this presentation attempt's unique source. */
export function getMorningBriefingRecoveryThreadId(
  threads: MorningBriefingThreadSummary[],
  threadSource: string,
): string | undefined {
  return threads.find(thread => thread.threadSource === threadSource)?.id
}

/** Find older morning briefing presentation tasks that should no longer be pinned. */
export function getMorningBriefingThreadIdsToUnpin(
  threads: MorningBriefingThreadSummary[],
  currentThreadId: string,
): string[] {
  return threads
    .filter(
      thread => thread.name?.startsWith("Morning briefing – ") && thread.id !== currentThreadId,
    )
    .map(thread => thread.id)
}

/** Create, verify, and pin a clean dated presentation task in Codex Desktop. */
export async function presentMorningBriefingInCodex(
  /** Saved briefing, daily note, and event-log paths. */
  args: PresentMorningBriefingInCodexArgs,
): Promise<void> {
  const eventLines: string[] = []
  let presentationThreadArchived = false
  let reviewStarted = false
  let presentationThreadId = ""
  const threadSource = `morning-briefing:${randomUUID()}`
  const child = spawn(args.codexCommand ?? CODEX_COMMAND_PATH, ["app-server"], {
    env: {
      ...process.env,
      CODEX_INTERNAL_ORIGINATOR_OVERRIDE: "Codex Desktop",
    },
    stdio: ["pipe", "pipe", "pipe"],
  })
  const lines = readline.createInterface({ input: child.stdout })
  child.stderr.on("data", chunk => process.stderr.write(chunk))

  try {
    await runPresentationStateMachine({
      ...args,
      child,
      eventLines,
      lines,
      threadSource,
      onReviewStarted: () => {
        reviewStarted = true
      },
      onThreadArchived: () => {
        presentationThreadArchived = true
      },
      onThreadCreated: threadId => {
        presentationThreadId = threadId
      },
    })
  } catch (error) {
    child.kill("SIGTERM")
    await waitForProcessExit(child)

    if (!presentationThreadArchived && !reviewStarted) {
      try {
        await archiveMorningBriefingThread({
          codexCommand: args.codexCommand ?? CODEX_COMMAND_PATH,
          eventLines,
          threadId: presentationThreadId || undefined,
          threadSource,
        })
      } catch (cleanupError) {
        throw new Error(
          `${toError(error).message}; failed to archive partial presentation task: ${toError(cleanupError).message}`,
        )
      }
    }

    throw error
  } finally {
    lines.close()
    child.stdin.end()
    child.kill("SIGTERM")
    writeTextAtomically(args.eventsPath, eventLines.length > 0 ? `${eventLines.join("\n")}\n` : "")
  }
}

/** Drive the sequential presentation protocol while retaining every server event. */
async function runPresentationStateMachine(args: PresentationStateMachineArgs): Promise<void> {
  const input = args.child.stdin
  if (!input) throw new Error("Codex App Server has no writable input stream")

  await new Promise<void>((resolve, reject) => {
    let finalMessage = ""
    let archiveRequestId: number | undefined
    let failureToReport: Error | undefined
    let nextRequestId = 4
    let phase: PresentationPhase = "initializing"
    let pinnedSectionId = ""
    let presentationThreadId = ""
    let settled = false
    const pinnedThreads: MorningBriefingThreadSummary[] = []
    const pendingUnpinRequestIds = new Set<number>()
    const sections: MorningBriefingThreadSection[] = []
    const timeout = setTimeout(
      () => stopWithError(new Error("Morning briefing presentation timed out"), false),
      PRESENTATION_TIMEOUT_MS,
    )

    const send = (request: unknown) => input.write(`${JSON.stringify(request)}\n`)
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      resolve()
    }
    const startReview = () => {
      phase = "reviewing"
      finalMessage = ""
      args.onReviewStarted()
      const request = getMorningBriefingPresentationTurnStartRequest(
        presentationThreadId,
        args.dailyNotePath,
      )
      send({
        ...request,
        id: nextRequestId++,
        params: {
          ...request.params,
          input: [{ type: "text", text: readMorningBriefingPrompt("task-review.prompt.md") }],
        },
      })
    }
    const stopWithError = (error: Error, archiveFailedThread = true) => {
      if (settled) return

      if (
        archiveFailedThread &&
        presentationThreadId &&
        phase !== "archiving-failed-thread" &&
        phase !== "reviewing"
      ) {
        failureToReport = error
        phase = "archiving-failed-thread"
        archiveRequestId = nextRequestId++
        send(getMorningBriefingArchiveRequest(presentationThreadId, archiveRequestId))
        return
      }

      settled = true
      clearTimeout(timeout)
      reject(failureToReport ?? error)
    }

    args.child.on("error", error => stopWithError(error, false))
    args.child.on("exit", (code, signal) => {
      if (settled) return
      stopWithError(
        new Error(
          signal
            ? `Codex App Server stopped by ${signal}`
            : `Codex App Server exited with status ${code ?? "unknown"}`,
        ),
        false,
      )
    })

    args.lines.on("line", line => {
      args.eventLines.push(line)
      if (settled) return

      try {
        const message = JSON.parse(line) as AppServerMessage
        if (message.id !== undefined && message.error) {
          stopWithError(new Error(message.error.message))
          return
        }

        if (message.id === archiveRequestId && phase === "archiving-failed-thread") {
          args.onThreadArchived()
          stopWithError(failureToReport ?? new Error("Morning briefing presentation failed"))
          return
        }

        if (message.id === 0 && phase === "initializing") {
          input.write(`${JSON.stringify({ method: "initialized", params: {} })}\n`)
          phase = "starting-thread"
          send(getMorningBriefingPresentationThreadStartRequest(args.threadSource))
          return
        }

        if (message.id === 1 && phase === "starting-thread") {
          presentationThreadId = message.result?.thread?.id ?? ""
          if (!presentationThreadId) {
            stopWithError(new Error("Codex App Server returned no presentation task ID"))
            return
          }

          args.onThreadCreated(presentationThreadId)
          phase = "naming-thread"
          send({
            method: "thread/name/set",
            id: 2,
            params: {
              name: `Morning briefing – ${formatDisplayDate(args.date)}`,
              threadId: presentationThreadId,
            },
          })
          return
        }

        if (message.id === 2 && phase === "naming-thread") {
          phase = "presenting"
          send(
            getMorningBriefingPresentationTurnStartRequest(
              presentationThreadId,
              args.dailyNotePath,
            ),
          )
          return
        }

        const item = message.params?.item
        if (message.method === "item/completed" && item?.type === "agentMessage") {
          if (phase === "presenting" || phase === "reviewing")
            finalMessage = item.text ?? finalMessage
          return
        }

        if (message.method === "turn/completed" && phase === "reviewing") {
          if (message.params?.turn?.status !== "completed" || !finalMessage.trim()) {
            stopWithError(
              new Error(
                message.params?.turn?.error?.message ??
                  "Task review did not start; the briefing remains pinned",
              ),
            )
            return
          }
          finish()
          return
        }

        if (message.method === "turn/completed" && phase === "presenting") {
          if (message.params?.turn?.status !== "completed") {
            stopWithError(
              new Error(message.params?.turn?.error?.message ?? "Presentation turn failed"),
            )
            return
          }
          if (finalMessage !== args.briefing.trimEnd()) {
            stopWithError(new Error("Codex presentation did not match the saved briefing"))
            return
          }

          phase = "listing-sections"
          send(getMorningBriefingThreadSectionListRequest(nextRequestId++))
          return
        }

        if (message.id !== undefined && phase === "listing-sections") {
          sections.push(...(message.result?.data ?? []))
          const pinnedSection = sections.find(section => section.name === "Pinned")
          if (pinnedSection) {
            pinnedSectionId = pinnedSection.id
            phase = "pinning"
            send({
              ...getMorningBriefingPinRequest(presentationThreadId, pinnedSectionId),
              id: nextRequestId++,
            })
            return
          }
          if (message.result?.nextCursor) {
            send(
              getMorningBriefingThreadSectionListRequest(
                nextRequestId++,
                message.result.nextCursor,
              ),
            )
            return
          }
          stopWithError(new Error("Codex Desktop has no Pinned sidebar section"))
          return
        }

        if (message.id !== undefined && phase === "pinning") {
          phase = "listing-pinned-threads"
          send(getMorningBriefingPinnedThreadsRequest(nextRequestId++, pinnedSectionId))
          return
        }

        if (message.id !== undefined && phase === "listing-pinned-threads") {
          pinnedThreads.push(...(message.result?.data ?? []))
          if (message.result?.nextCursor) {
            send(
              getMorningBriefingPinnedThreadsRequest(
                nextRequestId++,
                pinnedSectionId,
                message.result.nextCursor,
              ),
            )
            return
          }

          const threadIdsToUnpin = getMorningBriefingThreadIdsToUnpin(
            pinnedThreads,
            presentationThreadId,
          )
          if (threadIdsToUnpin.length === 0) {
            startReview()
            return
          }

          phase = "unpinning"
          threadIdsToUnpin.forEach(threadId => {
            const requestId = nextRequestId++
            pendingUnpinRequestIds.add(requestId)
            send(getMorningBriefingUnpinRequest(threadId, requestId))
          })
          return
        }

        if (
          message.id !== undefined &&
          phase === "unpinning" &&
          pendingUnpinRequestIds.delete(message.id) &&
          pendingUnpinRequestIds.size === 0
        ) {
          startReview()
        }
      } catch (error) {
        stopWithError(error instanceof Error ? error : new Error(String(error)))
      }
    })

    send(getMorningBriefingInitializeRequest())
  })
}

/** Archive a partial presentation through a fresh App Server connection. */
async function archiveMorningBriefingThread(args: ArchiveMorningBriefingThreadArgs): Promise<void> {
  const child = spawn(args.codexCommand, ["app-server"], {
    env: {
      ...process.env,
      CODEX_INTERNAL_ORIGINATOR_OVERRIDE: "Codex Desktop",
    },
    stdio: ["pipe", "pipe", "pipe"],
  })
  const lines = readline.createInterface({ input: child.stdout })
  child.stderr.on("data", chunk => process.stderr.write(chunk))

  try {
    await new Promise<void>((resolve, reject) => {
      let activeRequestId = 0
      let nextRequestId = 1
      let phase: RecoveryPhase = "initializing"
      let settled = false
      const timeout = setTimeout(
        () => stop(new Error("Timed out while archiving partial presentation task")),
        CLEANUP_TIMEOUT_MS,
      )
      const stop = (error?: Error) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        if (error) reject(error)
        else resolve()
      }
      const send = (request: unknown) => child.stdin.write(`${JSON.stringify(request)}\n`)

      child.on("error", error => stop(error))
      child.on("exit", (code, signal) => {
        if (settled) return
        stop(
          new Error(
            signal
              ? `Cleanup App Server stopped by ${signal}`
              : `Cleanup App Server exited with status ${code ?? "unknown"}`,
          ),
        )
      })
      lines.on("line", line => {
        args.eventLines.push(line)
        if (settled) return

        try {
          const message = JSON.parse(line) as AppServerMessage
          if (message.id !== undefined && message.error) {
            stop(new Error(message.error.message))
            return
          }
          if (message.id === 0) {
            send({ method: "initialized", params: {} })
            if (args.threadId) {
              phase = "archiving"
              activeRequestId = nextRequestId++
              send(getMorningBriefingArchiveRequest(args.threadId, activeRequestId))
            } else {
              phase = "discovering"
              activeRequestId = nextRequestId++
              send(getMorningBriefingRecoveryThreadsRequest(activeRequestId))
            }
            return
          }

          if (message.id !== activeRequestId) return
          if (phase === "archiving") {
            stop()
            return
          }

          if (phase === "discovering") {
            const threadId = getMorningBriefingRecoveryThreadId(
              message.result?.data ?? [],
              args.threadSource,
            )
            if (threadId) {
              phase = "archiving"
              activeRequestId = nextRequestId++
              send(getMorningBriefingArchiveRequest(threadId, activeRequestId))
              return
            }
            if (message.result?.nextCursor) {
              activeRequestId = nextRequestId++
              send(
                getMorningBriefingRecoveryThreadsRequest(
                  activeRequestId,
                  message.result.nextCursor,
                ),
              )
              return
            }
            stop()
          }
        } catch (error) {
          stop(toError(error))
        }
      })

      send(getMorningBriefingInitializeRequest())
    })
  } finally {
    lines.close()
    child.stdin.end()
    child.kill("SIGTERM")
  }
}

/** Wait for a process to stop, escalating after a short grace period. */
async function waitForProcessExit(child: PresentationChild): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return

  await new Promise<void>(resolve => {
    const forceKill = setTimeout(() => child.kill("SIGKILL"), FORCE_KILL_DELAY_MS)
    child.once("exit", () => {
      clearTimeout(forceKill)
      resolve()
    })
  })
}

/** Normalize an unknown thrown value. */
function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

/** Format a calendar date without shifting it through a local time zone. */
function formatDisplayDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number)
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year!, month! - 1, day!)))
}

export type MorningBriefingThreadSummary = {
  /** Persisted Codex task ID. */
  id: string
  /** User-visible task title. */
  name: string | null
  /** Client-supplied presentation-attempt identifier. */
  threadSource?: string | null
}

type PresentMorningBriefingInCodexArgs = {
  /** Validated briefing as saved in the daily note. */
  briefing: string
  /** Optional Codex executable override. */
  codexCommand?: string
  /** Daily note path read by the presentation agent. */
  dailyNotePath: string
  /** Target local date. */
  date: string
  /** App Server JSONL event log path. */
  eventsPath: string
}

type PresentationPhase =
  | "initializing"
  | "starting-thread"
  | "naming-thread"
  | "presenting"
  | "reviewing"
  | "listing-sections"
  | "pinning"
  | "listing-pinned-threads"
  | "unpinning"
  | "archiving-failed-thread"

type MorningBriefingThreadSection = {
  /** Opaque sidebar section ID. */
  id: string
  /** User-visible sidebar section name. */
  name: string
}

type PresentationChild = ReturnType<typeof spawn>

type PresentationStateMachineArgs = PresentMorningBriefingInCodexArgs & {
  /** Preserve the verified pinned briefing if the review kickoff fails. */
  onReviewStarted: () => void
  /** Running App Server process. */
  child: PresentationChild
  /** Buffered raw events. */
  eventLines: string[]
  /** Line reader for App Server stdout. */
  lines: readline.Interface
  /** Record that the partial task was archived in the current connection. */
  onThreadArchived: () => void
  /** Record the persistent task ID as soon as it exists. */
  onThreadCreated: (threadId: string) => void
  /** Unique marker used to recover a task if its start response is lost. */
  threadSource: string
}

type ArchiveMorningBriefingThreadArgs = {
  /** Codex executable used for the fresh cleanup connection. */
  codexCommand: string
  /** Shared App Server event log buffer. */
  eventLines: string[]
  /** Partial presentation task to archive. */
  threadId?: string
  /** Unique marker used to find a task when its ID response was lost. */
  threadSource: string
}

type RecoveryPhase = "initializing" | "discovering" | "archiving"

type AppServerMessage = {
  /** JSON-RPC request ID. */
  id?: number
  /** App Server notification name. */
  method?: string
  /** JSON-RPC error. */
  error?: { message: string }
  /** Response payload. */
  result?: {
    data?: Array<MorningBriefingThreadSummary & MorningBriefingThreadSection>
    nextCursor?: string | null
    thread?: { id: string }
  }
  /** Notification payload. */
  params?: {
    item?: { text?: string; type?: string }
    turn?: { error?: { message?: string } | null; status?: string }
  }
}
