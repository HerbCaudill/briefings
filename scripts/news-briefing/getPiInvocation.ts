import { dirname, join } from "node:path"

/** Launch the npm-installed Pi on Windows without cmd.exe interpreting the prompt. */
export function getPiInvocation(
  /** Literal Pi arguments, including the prompt. */
  args: string[],
  /** Operating system hosting the process. */
  platform: NodeJS.Platform = process.platform,
  /** Node executable whose global installation provides Pi. */
  nodePath: string = process.execPath,
) {
  return platform === "win32"
    ? {
        command: nodePath,
        args: [
          join(
            dirname(nodePath),
            "node_modules/@earendil-works/pi-coding-agent/dist/bundle/cli.js",
          ),
          ...args,
        ],
      }
    : { command: "pi", args }
}
