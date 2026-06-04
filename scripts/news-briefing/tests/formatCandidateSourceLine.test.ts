import { describe, expect, test } from "vitest"
import { formatCandidateSourceLine } from "../formatCandidateSourceLine.ts"

describe("formatCandidateSourceLine", () => {
  test("pads candidate counts after long source names", () => {
    expect(formatCandidateSourceLine("El Periódico Barcelona", 30)).toBe(
      "✅ El Periódico Barcelona       30",
    )
  })

  test("omits zero counts while preserving the source name", () => {
    expect(formatCandidateSourceLine("Diari de Barcelona", 0)).toBe("❌ Diari de Barcelona")
  })
})
