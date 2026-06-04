import { Either, ParseResult, Schema } from "effect"

/** Decode JSON text with an Effect schema and include parse details in failures. */
export function decodeJsonWithSchema<DecodedValue, EncodedValue>(
  /** The schema used to validate the parsed JSON value. */
  schema: Schema.Schema<DecodedValue, EncodedValue, never>,
  /** The JSON text to parse and decode. */
  value: string,
  /** A human-readable label for the boundary being decoded. */
  label: string,
): DecodedValue {
  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(value.trim())
  } catch (error) {
    throw new Error(`Invalid ${label} JSON: ${String(error)}`)
  }

  const decoded = Schema.decodeUnknownEither(schema, { errors: "all" })(parsedValue)

  if (Either.isLeft(decoded)) {
    throw new Error(
      `Invalid ${label} JSON:\n${ParseResult.TreeFormatter.formatErrorSync(decoded.left)}`,
    )
  }

  return decoded.right
}
