import { closeSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs"

/** Acquire the single-run lock, clearing it only when its recorded process is gone. */
export function acquireMorningBriefingRunLock(
  /** Lock file path. */
  path: string,
): () => void {
  try {
    return createLock(path)
  } catch (error) {
    if (!isAlreadyExistsError(error) || isRecordedProcessRunning(path)) throw error
    unlinkSync(path)
    return createLock(path)
  }
}

/** Create a new exclusive lock and return its release function. */
function createLock(path: string): () => void {
  const descriptor = openSync(path, "wx")
  writeFileSync(
    descriptor,
    `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`,
  )
  closeSync(descriptor)

  return () => {
    try {
      unlinkSync(path)
    } catch (error) {
      if (!isMissingError(error)) throw error
    }
  }
}

/** Check whether the PID in a pre-existing lock is still alive. */
function isRecordedProcessRunning(path: string): boolean {
  let pid: number

  try {
    const value = JSON.parse(readFileSync(path, "utf8")) as { pid?: unknown }
    if (typeof value.pid !== "number") return false
    pid = value.pid
  } catch (error) {
    if (error instanceof SyntaxError || isMissingError(error)) return false
    throw error
  }

  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    if (isMissingProcessError(error)) return false
    throw error
  }
}

/** Identify an exclusive-create collision. */
function isAlreadyExistsError(error: unknown): boolean {
  return isNodeError(error) && error.code === "EEXIST"
}

/** Identify a missing lock during release. */
function isMissingError(error: unknown): boolean {
  return isNodeError(error) && error.code === "ENOENT"
}

/** Identify a stale PID. */
function isMissingProcessError(error: unknown): boolean {
  return isNodeError(error) && error.code === "ESRCH"
}

/** Narrow unknown caught values to Node errors. */
function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error
}
