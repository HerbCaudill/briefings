import { expect, test, vi } from "vitest"

import { runScheduledBriefings } from "../runScheduledBriefings.ts"

test("runs both briefings concurrently and waits for news even when the personal briefing fails", async () => {
  let releaseNews: () => void = () => {}
  const presentNews = vi.fn()
  const runNews = vi.fn(
    () =>
      new Promise<void>(resolve => {
        releaseNews = resolve
      }),
  )
  const run = runScheduledBriefings({
    runMorning: async () => {
      throw new Error("personal failed")
    },
    runNews,
    presentNews,
  })
  let settled = false
  void run.catch(() => {
    settled = true
  })
  await vi.waitFor(() => expect(runNews).toHaveBeenCalledOnce())
  expect(settled).toBe(false)
  releaseNews()
  await expect(run).rejects.toThrow("personal failed")
  expect(presentNews).toHaveBeenCalledOnce()
})

test("returns the personal briefing and presents news only after successful generation", async () => {
  const calls: string[] = []
  await expect(
    runScheduledBriefings({
      runMorning: async () => "Personal briefing",
      runNews: async () => {
        calls.push("generate")
      },
      presentNews: async () => {
        calls.push("present")
      },
    }),
  ).resolves.toBe("Personal briefing")
  expect(calls).toEqual(["generate", "present"])

  const presentNews = vi.fn()
  const runMorning = vi.fn().mockResolvedValue("Personal briefing")
  await expect(
    runScheduledBriefings({
      runMorning,
      runNews: async () => {
        throw new Error("news failed")
      },
      presentNews,
    }),
  ).rejects.toThrow("news failed")
  expect(runMorning).toHaveBeenCalledOnce()
  expect(presentNews).not.toHaveBeenCalled()
})
