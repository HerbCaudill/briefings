import { readFileSync } from "node:fs"
import type { LocalMessagesSource } from "./types.ts"

/** Read the last Mac export while retaining useful conversations when the laptop is offline. */
export function readMacMessagesArtifact(
  /** Private JSON artifact exported by the Mac job. */
  path: string,
  /** Clock used to describe source freshness. */
  now = new Date(),
): LocalMessagesSource {
  try {
    const value = JSON.parse(readFileSync(path, "utf8"))
    if (
      value.version !== 1 ||
      typeof value.exportedAt !== "string" ||
      !Number.isFinite(Date.parse(value.exportedAt))
    )
      throw new Error("Invalid export metadata")
    const source = value.source
    if (
      source?.source !== "Apple Messages" ||
      !["complete", "unavailable"].includes(source.status) ||
      !Array.isArray(source.conversations) ||
      !source.conversations.every(
        (conversation: unknown) =>
          typeof conversation === "object" &&
          conversation !== null &&
          "name" in conversation &&
          typeof conversation.name === "string" &&
          "transcript" in conversation &&
          typeof conversation.transcript === "string",
      )
    )
      throw new Error("Invalid exported source")
    const stale = now.getTime() - Date.parse(value.exportedAt) > 2 * 60 * 60 * 1_000
    return {
      source: "Apple Messages",
      status: source.status === "complete" && stale ? "stale" : source.status,
      exportedAt: value.exportedAt,
      conversations: source.conversations,
      ...(source.status === "unavailable"
        ? {
            reason:
              typeof source.reason === "string"
                ? source.reason
                : "Mac could not read Apple Messages",
          }
        : stale
          ? {
              reason: `Mac export is stale; last exported ${value.exportedAt}. Retained conversations remain available.`,
            }
          : {}),
    }
  } catch {
    return {
      source: "Apple Messages",
      status: "unavailable",
      reason: "No valid Mac Messages export is available yet",
      conversations: [],
    }
  }
}
