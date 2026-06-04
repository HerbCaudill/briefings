import { describe, expect, test } from "vitest"
import { retry } from "../retry.ts"

describe("retry", () => {
  test("retries failed operations until one succeeds", async () => {
    let attempts = 0

    const result = await retry(async () => {
      attempts += 1

      if (attempts < 3) {
        throw new Error("temporary failure")
      }

      return "success"
    }, 3)

    expect(result).toBe("success")
    expect(attempts).toBe(3)
  })

  test("throws the final error after all attempts fail", async () => {
    let attempts = 0

    await expect(
      retry(async () => {
        attempts += 1
        throw new Error(`failure ${attempts}`)
      }, 3),
    ).rejects.toThrow("failure 3")

    expect(attempts).toBe(3)
  })
})
