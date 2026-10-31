/** Give the mini's communications lane an explicit browser MCP instead of relying on global config. */
export function getAgentChromeMcpArgs(
  /** Host platform; the Mac keeps its existing browser routing. */
  platform: NodeJS.Platform,
  /** Agent lane that owns browser communications. */
  threadSource: string,
): string[] {
  if (platform !== "win32" || threadSource !== "morning-briefing-communications") return []

  const settings = {
    command: "cmd.exe",
    args: [
      "/d",
      "/c",
      "npx",
      "-y",
      "chrome-devtools-mcp@1.12.0",
      "--browserUrl=http://127.0.0.1:9223",
      "--no-usage-statistics",
      "--no-performance-crux",
      "--no-source-maps",
      "--redactNetworkHeaders",
    ],
    startup_timeout_sec: 60,
    tool_timeout_sec: 45,
  }
  return Object.entries(settings).flatMap(([key, value]) => [
    "--config",
    `mcp_servers.chrome-devtools.${key}=${JSON.stringify(value)}`,
  ])
}
