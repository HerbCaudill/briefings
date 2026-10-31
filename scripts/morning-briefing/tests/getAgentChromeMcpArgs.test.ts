import { expect, test } from "vitest"

import { getAgentChromeMcpArgs } from "../getAgentChromeMcpArgs.ts"

test("gives the Windows communications agent its own Agent Chrome connection", () => {
  const args = getAgentChromeMcpArgs("win32", "morning-briefing-communications")
  expect(args.join(" ")).toContain("mcp_servers.chrome-devtools.command")
  expect(args.join(" ")).toContain("chrome-devtools-mcp@1.12.0")
  expect(args.join(" ")).toContain("http://127.0.0.1:9223")
  expect(args.join(" ")).toContain("redactNetworkHeaders")
})

test("leaves other lanes and the Mac's browser configuration alone", () => {
  expect(getAgentChromeMcpArgs("win32", "morning-briefing-schedule")).toEqual([])
  expect(getAgentChromeMcpArgs("darwin", "morning-briefing-communications")).toEqual([])
})
