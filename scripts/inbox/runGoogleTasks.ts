import { execFile } from "node:child_process"
import { promisify } from "node:util"

import type { GwsRequest } from "./types.ts"

/** Execute an authenticated API request without exposing credentials. */
export async function runGoogleTasks(
  command: readonly string[],
  request: GwsRequest,
): Promise<unknown> {
  const args = [...command, "--params", JSON.stringify(request.params ?? {})]
  if (request.body) args.push("--json", JSON.stringify(request.body))
  const { stdout } = await promisify(execFile)("gws-delegated", args, {
    maxBuffer: 16 * 1024 * 1024,
  })
  return JSON.parse(stdout) as unknown
}
