import { describe, expect, test } from "vitest"
import { mapWithConcurrency } from "../mapWithConcurrency.ts"

describe("mapWithConcurrency", () => {
  test("preserves input order when operations resolve out of order", async () => {
    const result = await mapWithConcurrency([30, 10, 20], 3, async value => {
      await new Promise(resolve => setTimeout(resolve, value))
      return value / 10
    })

    expect(result).toEqual([3, 1, 2])
  })

  test("does not run more than the requested number of operations at once", async () => {
    let activeCount = 0
    let maxActiveCount = 0

    await mapWithConcurrency([1, 2, 3, 4, 5], 2, async value => {
      activeCount += 1
      maxActiveCount = Math.max(maxActiveCount, activeCount)
      await new Promise(resolve => setTimeout(resolve, 1))
      activeCount -= 1
      return value
    })

    expect(maxActiveCount).toBe(2)
  })
})
