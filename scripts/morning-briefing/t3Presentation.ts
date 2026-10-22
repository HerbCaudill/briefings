import { execFile } from "node:child_process"
import { readFileSync } from "node:fs"
import { promisify } from "node:util"

import { T3_APP_NAME, T3_WEBHOOK_URL_PATH } from "./constants.ts"
import { openWindowsDesktopApp } from "./openWindowsDesktopApp.ts"

/**
 * Open T3 Code, then trigger its webhook task, which starts a fresh pinned thread that presents
 * the saved briefing and begins the Inbox review. The T3 relay holds the request until the app
 * is online, so this does not wait for the server to finish starting.
 */
export async function presentMorningBriefingInT3(
  /** Saved briefing location and injectable dependencies. */
  args: PresentMorningBriefingInT3Args,
): Promise<void> {
  await presentBriefingInT3({
    ...args,
    payload: { dailyNotePath: args.dailyNotePath, date: args.date },
    webhookUrlPath: args.webhookUrlPath ?? T3_WEBHOOK_URL_PATH,
  })
}

/** Open T3 and deliver a saved briefing location to its presentation task. */
export async function presentBriefingInT3(
  /** Webhook credential path, saved artifact, and optional transport overrides. */
  args: PresentBriefingInT3Args,
): Promise<void> {
  const webhookUrl = readWebhookUrl(args.webhookUrlPath)
  const openT3 = args.openT3 ?? openT3App
  const fetch_ = args.fetch ?? fetch

  await openT3()
  const response = await fetch_(webhookUrl, {
    body: JSON.stringify(args.payload),
    headers: { "content-type": "application/json" },
    method: "POST",
  })
  if (!response.ok) {
    const detail = (await response.text()).trim().slice(0, 500)
    throw new Error(`T3 webhook returned ${response.status}${detail ? `: ${detail}` : ""}`)
  }
}

type PresentBriefingInT3Args = {
  /** Saved briefing location and target date for the task prompt. */
  payload: Record<string, string>
  /** Private file containing this presentation task's webhook URL. */
  webhookUrlPath: string
  /** Optional HTTP client. */
  fetch?: (url: string, init: RequestInit) => Promise<Response>
  /** Optional T3 Code launcher. */
  openT3?: () => Promise<void>
}

/** Read the private webhook URL, which acts as the task's credential. */
function readWebhookUrl(path: string): string {
  try {
    const url = readFileSync(path, "utf8").trim()
    if (url) return url
  } catch {
    // Report missing and unreadable credentials with the same actionable path.
  }
  throw new Error(`Missing T3 webhook URL in ${path}`)
}

/** Open T3 Code in the background; this does nothing when it is already running. */
async function openT3App(): Promise<void> {
  if (process.platform === "win32") return openWindowsDesktopApp("T3 desktop")
  await promisify(execFile)("/usr/bin/open", ["-g", "-a", T3_APP_NAME])
}

export type PresentMorningBriefingInT3Args = {
  /** Daily note containing the saved briefing. */
  dailyNotePath: string
  /** Target local date. */
  date: string
  /** Optional HTTP client. */
  fetch?: (url: string, init: RequestInit) => Promise<Response>
  /** Optional T3 Code launcher. */
  openT3?: () => Promise<void>
  /** Optional path to the file containing the webhook URL. */
  webhookUrlPath?: string
}
