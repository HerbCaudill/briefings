/** Parse a JSON object returned by an agent, allowing surrounding whitespace only. */
export function parseJsonObject<T>(
  /** The agent output to parse. */
  value: string,
): T {
  return JSON.parse(value.trim()) as T
}
