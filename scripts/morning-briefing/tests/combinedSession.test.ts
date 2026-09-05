import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "vitest"
import { presentMorningBriefingInCodex } from "../codexPresentation.ts"

test("presents the exact briefing then starts one Inbox/Today review in the same pinned session", async () => {
  const root = mkdtempSync(join(tmpdir(), "combined-session-"))
  const command = join(root, "codex")
  writeFileSync(
    command,
    `#!/usr/bin/env node
const readline = require('node:readline');
let turns = 0;
const send = value => console.log(JSON.stringify(value));
readline.createInterface({ input: process.stdin }).on('line', line => {
  const r = JSON.parse(line);
  if (r.method === 'initialized') return;
  let result = {};
  if (r.method === 'thread/start') result = { thread: { id: 'session' } };
  if (r.method === 'threadSection/list') result = { data: [{ id: 'pin-section', name: 'Pinned' }] };
  if (r.method === 'thread/list') result = { data: [] };
  send({ id: r.id, result });
  if (r.method === 'turn/start') {
    turns++;
    send({ method: 'test/turn', params: r.params });
    send({ method: 'item/completed', params: { item: { type: 'agentMessage', text: turns === 1 ? '## Daily briefing\\n\\nGood morning.' : 'Return the shorts: is this still outstanding?' } } });
    send({ method: 'turn/completed', params: { turn: { status: 'completed' } } });
  }
});
`,
  )
  chmodSync(command, 0o755)
  const eventsPath = join(root, "events.jsonl")
  await presentMorningBriefingInCodex({
    briefing: "## Daily briefing\n\nGood morning.\n",
    codexCommand: command,
    dailyNotePath: join(root, "daily.md"),
    date: "2026-09-05",
    eventsPath,
  })
  const turns = readFileSync(eventsPath, "utf8")
    .trim()
    .split("\n")
    .map(line => JSON.parse(line))
    .filter(event => event.method === "test/turn")
  expect(turns).toHaveLength(2)
  expect(turns.map(turn => turn.params.threadId)).toEqual(["session", "session"])
  expect(turns[1].params.input[0].text).toBe("$task-review inbox, today")
})
