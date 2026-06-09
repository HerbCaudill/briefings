import { describe, expect, test } from "vitest"
import { formatTotalCandidateLine } from "../formatTotalCandidateLine.ts"

describe("formatTotalCandidateLine", () => {
  test("aligns total counts with candidate source rows", () => {
    expect(formatTotalCandidateLine(552)).toBe("   Total candidates             552")
  })
})
