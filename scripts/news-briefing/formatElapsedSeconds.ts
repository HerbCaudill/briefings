/** Format a millisecond duration as whole seconds for console output. */
export function formatElapsedSeconds(
  /** The elapsed duration in milliseconds. */
  milliseconds: number,
): string {
  return `${Math.round(milliseconds / 1000)}s`
}
