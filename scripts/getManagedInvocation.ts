import { homedir } from "node:os"
import { join } from "node:path"

/** Resolve the managed Windows entrypoint without interpreting JSON through cmd.exe. */
export function getManagedInvocation(
  /** Installed managed CLI. */
  command: "tasks" | "gws-delegated",
  /** Literal CLI arguments. */
  args: string[],
) {
  if (process.platform !== "win32") return { command, args }
  const entry =
    command === "tasks"
      ? "scripts/tasks-agent/windowsCli.ts"
      : "scripts/google-workspace/runDelegatedGws.ts"
  return {
    command: process.execPath,
    args: [join(homedir(), "Code/HerbCaudill/dotfiles", entry), ...args],
  }
}
