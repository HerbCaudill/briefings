import { Schema } from "effect"
import { describe, expect, test } from "vitest"

import { decodeJsonWithSchema } from "../decodeJsonWithSchema.ts"

const ExampleSchema = Schema.Struct({ message: Schema.String })

describe("decodeJsonWithSchema", () => {
  test("decodes JSON wrapped in a markdown code fence", () => {
    const decoded = decodeJsonWithSchema(
      ExampleSchema,
      '```json\n{"message":"hello"}\n```',
      "example",
    )

    expect(decoded).toEqual({ message: "hello" })
  })
})
