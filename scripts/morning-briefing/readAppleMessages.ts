import { readdirSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"

import type { LocalConversation, LocalMessagesSource } from "./types.ts"

/**
 * Read recent Apple Messages conversations directly from chat.db, which works with the screen
 * locked. The calling process needs Full Disk Access.
 */
export function readAppleMessages(
  /** Time window and optional fixture paths. */
  args: {
    /** Earliest message to include. */
    since: Date
    /** Time zone for transcript timestamps. */
    timeZone: string
    /** Messages database; defaults to the signed-in user's. */
    chatDatabasePath?: string
    /** Contacts databases used to name handles; defaults to every local source. */
    addressBookPaths?: readonly string[]
  },
): LocalMessagesSource {
  const chatDatabasePath = args.chatDatabasePath ?? join(homedir(), "Library/Messages/chat.db")
  let rows: MessageRow[]
  try {
    const database = new DatabaseSync(chatDatabasePath, { readOnly: true })
    try {
      rows = database
        .prepare(MESSAGES_QUERY)
        .all(toAppleTime(args.since)) as unknown as MessageRow[]
    } finally {
      database.close()
    }
  } catch (error) {
    return {
      source: "Apple Messages",
      status: "unavailable",
      reason: `Could not read ${chatDatabasePath}; the morning briefing launcher needs Full Disk Access (${error instanceof Error ? error.message : String(error)})`,
      conversations: [],
    }
  }

  const names = readContactNames(args.addressBookPaths ?? findAddressBooks())
  const nameOf = (handle: string | null) => (handle ? (names(handle) ?? handle) : "Unknown")
  const formatTime = createTimeFormatter(args.timeZone)
  const chats = new Map<number, { name: string | null; senders: Set<string>; lines: string[] }>()

  for (const row of rows) {
    const line = describeMessage(row)
    if (line === undefined) continue
    const sender = row.fromMe ? "You" : nameOf(row.handle)
    const chat = chats.get(row.chatId) ?? {
      name:
        row.chatName ||
        (row.chatIdentifier?.startsWith("chat") ? null : nameOf(row.chatIdentifier)),
      senders: new Set<string>(),
      lines: [],
    }
    if (!row.fromMe) chat.senders.add(sender)
    chat.lines.push(`${formatTime(row.dateMs)} ${sender}: ${line}`)
    chats.set(row.chatId, chat)
  }

  const conversations: LocalConversation[] = [...chats.values()].map(chat => ({
    name: chat.name ?? ([...chat.senders].join(", ") || "Unnamed group"),
    transcript: chat.lines.slice(-MAX_LINES_PER_CONVERSATION).join("\n"),
  }))
  return { source: "Apple Messages", status: "complete", conversations }
}

/** Render one message body, or skip retractions and empty events. */
function describeMessage(row: MessageRow): string | undefined {
  // Tapbacks use associated types 2000–2999; 3000+ removes one.
  if (row.associated >= 3000) return undefined
  const text = (row.text || decodeAttributedBody(row.body))?.trim()
  if (row.associated >= 2000) return text ? `[reaction] ${text}` : undefined
  if (text) return row.attachments ? `[attachment] ${text}` : text
  return row.attachments ? "[attachment]" : undefined
}

/** Extract the plain string from the typedstream archive newer macOS versions store. */
function decodeAttributedBody(body: Uint8Array | null): string | undefined {
  if (!body) return undefined
  const bytes = Buffer.from(body)
  const marker = bytes.indexOf("NSString")
  if (marker < 0) return undefined
  // After the class name come five bytes of typedstream framing, then a length-prefixed string.
  let offset = marker + "NSString".length + 5
  let length = bytes[offset]!
  offset += 1
  if (length === 0x81) {
    length = bytes.readUInt16LE(offset)
    offset += 2
  } else if (length === 0x82) {
    length = bytes.readUInt32LE(offset)
    offset += 4
  }
  return bytes.subarray(offset, offset + length).toString("utf8")
}

/** Map phone numbers and email addresses to contact names without guessing. */
function readContactNames(paths: readonly string[]): (handle: string) => string | undefined {
  const byPhone = new Map<string, string>()
  const byEmail = new Map<string, string>()
  for (const path of paths) {
    try {
      const database = new DatabaseSync(path, { readOnly: true })
      try {
        for (const row of database.prepare(PHONES_QUERY).all() as unknown as ContactRow[]) {
          const name = contactName(row)
          const key = phoneKey(row.value)
          if (name && key && !byPhone.has(key)) byPhone.set(key, name)
        }
        for (const row of database.prepare(EMAILS_QUERY).all() as unknown as ContactRow[]) {
          const name = contactName(row)
          if (name && row.value) byEmail.set(row.value.trim().toLowerCase(), name)
        }
      } finally {
        database.close()
      }
    } catch {
      // An unreadable Contacts source leaves handles unnamed, which is safe.
    }
  }
  return handle =>
    handle.includes("@")
      ? byEmail.get(handle.trim().toLowerCase())
      : byPhone.get(phoneKey(handle) ?? "")
}

/** Compare phone numbers by their last nine digits so country-code variants match. */
function phoneKey(value: string | null): string | undefined {
  const digits = value?.replace(/\D/g, "") ?? ""
  return digits.length >= 7 ? digits.slice(-9) : undefined
}

/** Prefer the person's name, then the organization. */
function contactName(row: ContactRow): string | undefined {
  return [row.first, row.last].filter(Boolean).join(" ").trim() || row.organization || undefined
}

/** List every local Contacts database. */
function findAddressBooks(): string[] {
  const root = join(homedir(), "Library/Application Support/AddressBook")
  const sources = (() => {
    try {
      return readdirSync(join(root, "Sources")).map(source =>
        join(root, "Sources", source, "AddressBook-v22.abcddb"),
      )
    } catch {
      return []
    }
  })()
  return [join(root, "AddressBook-v22.abcddb"), ...sources]
}

/** Format epoch milliseconds as `YYYY-MM-DD HH:MM` in the briefing time zone. */
function createTimeFormatter(timeZone: string): (epochMs: number) => string {
  const format = new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
  return epochMs => format.format(new Date(epochMs))
}

/** Convert a date to Messages' nanoseconds since 2001-01-01. */
function toAppleTime(date: Date): bigint {
  return (BigInt(date.getTime()) - APPLE_EPOCH_MS) * 1_000_000n
}

// CONSTANTS

const APPLE_EPOCH_MS = 978_307_200_000n

/** Keep long group chats readable for the gather agent. */
const MAX_LINES_PER_CONVERSATION = 200

const MESSAGES_QUERY = `
  SELECT
    m.date / 1000000 + ${APPLE_EPOCH_MS} AS dateMs,
    m.is_from_me AS fromMe,
    m.text AS text,
    m.attributedBody AS body,
    m.associated_message_type AS associated,
    m.cache_has_attachments AS attachments,
    c.ROWID AS chatId,
    c.display_name AS chatName,
    c.chat_identifier AS chatIdentifier,
    h.id AS handle
  FROM message m
  JOIN chat_message_join j ON j.message_id = m.ROWID
  JOIN chat c ON c.ROWID = j.chat_id
  LEFT JOIN handle h ON h.ROWID = m.handle_id
  WHERE m.date >= ?
  ORDER BY m.date
`

const PHONES_QUERY = `
  SELECT r.ZFIRSTNAME AS first, r.ZLASTNAME AS last, r.ZORGANIZATION AS organization, p.ZFULLNUMBER AS value
  FROM ZABCDPHONENUMBER p JOIN ZABCDRECORD r ON r.Z_PK = p.ZOWNER
`

const EMAILS_QUERY = `
  SELECT r.ZFIRSTNAME AS first, r.ZLASTNAME AS last, r.ZORGANIZATION AS organization, e.ZADDRESS AS value
  FROM ZABCDEMAILADDRESS e JOIN ZABCDRECORD r ON r.Z_PK = e.ZOWNER
`

// TYPES

type MessageRow = {
  dateMs: number
  fromMe: number
  text: string | null
  body: Uint8Array | null
  associated: number
  attachments: number
  chatId: number
  chatName: string | null
  chatIdentifier: string | null
  handle: string | null
}

type ContactRow = {
  first: string | null
  last: string | null
  organization: string | null
  value: string | null
}
