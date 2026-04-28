/** Retry an async operation up to the configured attempt count. */
export async function retry<T>(
  /** The async operation to execute. */
  operation: () => Promise<T>,
  /** The total number of attempts to allow. */
  attempts: number,
): Promise<T> {
  let lastError: unknown

  for (let index = 0; index < attempts; index += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}
