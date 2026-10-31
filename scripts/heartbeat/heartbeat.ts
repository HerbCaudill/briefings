const RUNNING_STATUSES = new Set(["preparing", "queued", "starting", "running"])

// The peak day, October 24, 2026, averaged 24 commits an hour. These floors are a third of that.
const RUNNING_THREAD_FLOOR = 3
const COMMITS_PER_HOUR_FLOOR = 8
const PACE_CHECK_INTERVAL_MS = 2 * 60 * 60 * 1_000

/** Classify e2e as stalled when work has stopped, and slow when it runs below the pace floors. */
export function getE2eHealth(
  /** Current e2e threads and recent commit count. */
  args: GetE2eHealthArgs,
): E2eHealth {
  const runningCount = args.threads.filter(thread => RUNNING_STATUSES.has(thread.status)).length
  if (runningCount === 0 || args.commitsLastHour === 0) return "stalled"
  return runningCount >= RUNNING_THREAD_FLOOR && args.commitsLastHour >= COMMITS_PER_HOUR_FLOOR
    ? "active"
    : "slow"
}

/** Call an agent for every stall, but for slow work at most every two hours, since it may have a good reason. */
export function shouldInvestigate(
  /** Current health and when slow work was last checked. */
  args: ShouldInvestigateArgs,
): boolean {
  if (args.health === "stalled") return true
  if (args.health === "active") return false
  if (!args.lastPaceCheckAt) return true
  return args.now.getTime() - new Date(args.lastPaceCheckAt).getTime() >= PACE_CHECK_INTERVAL_MS
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

export type E2eHealth = "active" | "slow" | "stalled"

export type ShouldInvestigateArgs = {
  /** Current e2e health. */
  health: E2eHealth
  /** ISO time slow work was last checked. */
  lastPaceCheckAt?: string
  /** Current time. */
  now: Date
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
