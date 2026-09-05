import { expect, test } from "vitest"
import { loadGoogleTasks } from "../loadGoogleTasks.ts"
import type { GwsRequest, GwsRunner } from "../types.ts"

test("reads open tasks by default and bounds completed history to the capture date for recovery", async () => {
  const requests: GwsRequest[] = []
  const run: GwsRunner = async (command, request) => {
    if (command[1] === "tasklists") return { items: [{ id: "inbox", title: "Inbox" }] }
    requests.push(request)
    return { items: [] }
  }
  await loadGoogleTasks(run)
  expect(requests).toHaveLength(1)
  expect(requests[0]!.params?.showCompleted).toBe(false)
  requests.length = 0
  await loadGoogleTasks(run, "2026-09-03T11:24:07+02:00")
  const completed = requests.filter(request => request.params?.showCompleted)
  expect(completed).toHaveLength(1)
  expect(completed[0]!.params?.completedMin).toBe("2026-09-03T11:24:07+02:00")
})
