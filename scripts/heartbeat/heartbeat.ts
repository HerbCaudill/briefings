const RUNNING_STATUSES = new Set(["preparing", "queued", "starting", "running"])

/** Classify e2e as active only when an agent is running and commits are still landing. */
export function getE2eHealth(
  /** Current e2e threads and recent commit count. */
  args: GetE2eHealthArgs,
): "active" | "stalled" {
  const isRunning = args.threads.some(thread => RUNNING_STATUSES.has(thread.status))
  return isRunning && args.commitsLastHour > 0 ? "active" : "stalled"
}

/** Find the newest morning briefing thread for a date, which is where Herb is told about blockers. */
export function findBriefingThread<T extends BriefingThread>(
  /** Candidate threads and the local date. */
  args: FindBriefingThreadArgs<T>,
): T | undefined {
  return args.threads
    .filter(thread => thread.title === `Morning briefing – ${args.date}`)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

/** Report each blocker once, so a repeated blocker stays quiet. */
export function shouldNotifyHerb(
  /** Current blocker and the blockers Herb has already heard about. */
  args: ShouldNotifyHerbArgs,
): boolean {
  return !args.notifiedBlockerKeys.includes(args.blockerKey)
}

export type GetE2eHealthArgs = {
  /** Threads in the e2e project. */
  threads: { status: string }[]
  /** Commits on origin/main in the last 60 minutes. */
  commitsLastHour: number
}

export type BriefingThread = {
  /** T3 thread ID. */
  threadId: string
  /** Thread title. */
  title: string
  /** ISO creation time. */
  createdAt: string
}

export type FindBriefingThreadArgs<T extends BriefingThread> = {
  /** Candidate threads. */
  threads: T[]
  /** Local date as YYYY-MM-DD. */
  date: string
}

export type ShouldNotifyHerbArgs = {
  /** Stable name for the current blocker. */
  blockerKey: string
  /** Blockers already reported. */
  notifiedBlockerKeys: string[]
}
