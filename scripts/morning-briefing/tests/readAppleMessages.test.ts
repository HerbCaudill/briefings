import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { describe, expect, test } from "vitest"

import { readAppleMessages } from "../readAppleMessages.ts"

describe("readAppleMessages", () => {
  test("returns named transcripts of recent messages, including attributed bodies", () => {
    const directory = mkdtempSync(join(tmpdir(), "apple-messages-"))
    const chatDatabasePath = join(directory, "chat.db")
    const addressBookPath = join(directory, "AddressBook-v22.abcddb")
    createChatDatabase(chatDatabasePath)
    createAddressBook(addressBookPath)

    expect(
      readAppleMessages({
        addressBookPaths: [addressBookPath],
        chatDatabasePath,
        since: new Date("2026-10-05T00:00:00+02:00"),
        timeZone: "Europe/Madrid",
      }),
    ).toEqual({
      source: "Apple Messages",
      status: "complete",
      conversations: [
        {
          name: "Ann Lee",
          transcript: [
            "2026-10-06 09:00 Ann Lee: Are you free Friday?",
            "2026-10-06 09:30 You: Yes, after lunch",
            "2026-10-06 09:31 Ann Lee: [reaction] Loved “Yes, after lunch”",
          ].join("\n"),
        },
        {
          name: "Family",
          transcript: [
            "2026-10-07 20:00 +15550100: [attachment]",
            "2026-10-07 20:01 You: Nice photo",
          ].join("\n"),
        },
      ],
    })
  })

  test("reports the access problem instead of an empty result", () => {
    const result = readAppleMessages({
      addressBookPaths: [],
      chatDatabasePath: join(tmpdir(), "missing", "chat.db"),
      since: new Date("2026-10-05T00:00:00+02:00"),
      timeZone: "Europe/Madrid",
    })

    expect(result).toMatchObject({ source: "Apple Messages", status: "unavailable" })
    expect(result.reason).toContain("Full Disk Access")
  })
})

/** Build a minimal chat.db with the columns the reader uses. */
function createChatDatabase(path: string): void {
  const database = new DatabaseSync(path)
  database.exec(`
    CREATE TABLE handle (ROWID INTEGER PRIMARY KEY, id TEXT);
    CREATE TABLE chat (ROWID INTEGER PRIMARY KEY, chat_identifier TEXT, display_name TEXT);
    CREATE TABLE message (
      ROWID INTEGER PRIMARY KEY, text TEXT, attributedBody BLOB, date INTEGER, is_from_me INTEGER,
      handle_id INTEGER, associated_message_type INTEGER, cache_has_attachments INTEGER
    );
    CREATE TABLE chat_message_join (chat_id INTEGER, message_id INTEGER);
    INSERT INTO handle VALUES (1, '+34600111222'), (2, '+15550100');
    INSERT INTO chat VALUES (1, '+34600111222', ''), (2, 'chat123', 'Family');
  `)
  const insert = database.prepare("INSERT INTO message VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
  const join = database.prepare("INSERT INTO chat_message_join VALUES (?, ?)")
  const messages: [
    number,
    string | null,
    Uint8Array | null,
    string,
    number,
    number,
    number,
    number,
  ][] = [
    [1, "Too old", null, "2026-10-01T10:00:00+02:00", 0, 1, 0, 0],
    [2, "Are you free Friday?", null, "2026-10-06T09:00:00+02:00", 0, 1, 0, 0],
    [3, null, attributedBody("Yes, after lunch"), "2026-10-06T09:30:00+02:00", 1, 0, 0, 0],
    [4, "Loved “Yes, after lunch”", null, "2026-10-06T09:31:00+02:00", 0, 1, 2000, 0],
    [5, "Removed a heart", null, "2026-10-06T09:32:00+02:00", 0, 1, 3000, 0],
    [6, null, null, "2026-10-07T20:00:00+02:00", 0, 2, 0, 1],
    [7, "Nice photo", null, "2026-10-07T20:01:00+02:00", 1, 0, 0, 0],
  ]
  for (const [id, text, body, at, fromMe, handle, associated, attachments] of messages) {
    insert.run(id, text, body, appleTime(at), fromMe, handle, associated, attachments)
    join.run(id <= 5 ? 1 : 2, id)
  }
  database.close()
}

/** Build a minimal Contacts database with one person. */
function createAddressBook(path: string): void {
  const database = new DatabaseSync(path)
  database.exec(`
    CREATE TABLE ZABCDRECORD (Z_PK INTEGER PRIMARY KEY, ZFIRSTNAME TEXT, ZLASTNAME TEXT, ZORGANIZATION TEXT);
    CREATE TABLE ZABCDPHONENUMBER (ZOWNER INTEGER, ZFULLNUMBER TEXT);
    CREATE TABLE ZABCDEMAILADDRESS (ZOWNER INTEGER, ZADDRESS TEXT);
    INSERT INTO ZABCDRECORD VALUES (1, 'Ann', 'Lee', NULL);
    INSERT INTO ZABCDPHONENUMBER VALUES (1, '600 11 12 22');
  `)
  database.close()
}

/** Encode text the way Messages stores it in a typedstream attributed body. */
function attributedBody(text: string): Uint8Array {
  const encoded = Buffer.from(text, "utf8")
  return Buffer.concat([
    Buffer.from(
      "\x04\x0bstreamtyped\x81\xe8\x03\x84\x01@\x84\x84\x84\x12NSAttributedString\x00\x84\x84\x08NSObject\x00\x85\x92\x84\x84\x84\x08NSString",
      "latin1",
    ),
    Buffer.from([0x01, 0x94, 0x84, 0x01, 0x2b, encoded.length]),
    encoded,
    Buffer.from([0x86, 0x84]),
  ])
}

/** Convert an ISO time to Messages' nanoseconds since 2001-01-01. */
function appleTime(iso: string): bigint {
  return (BigInt(Date.parse(iso)) - 978_307_200_000n) * 1_000_000n
}
