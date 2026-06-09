/** Remove a surrounding markdown code fence from model JSON output when present. */
export function stripMarkdownJsonFence(
  /** The raw model output that should contain JSON. */
  value: string,
): string {
  const trimmedValue = value.trim()
  const match = trimmedValue.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i)

  return match?.[1]?.trim() ?? trimmedValue
}
