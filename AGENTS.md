## Commands

```bash
pnpm dev             # Start dev server (Vite)
pnpm build           # Type-check + build (tsc -b && vite build)
pnpm lint            # ESLint
pnpm preview         # Preview production build
pnpm test            # Vitest
pnpm format          # Prettier
pnpm briefing:news    # Fetch today, then synthesize any missing final briefings
pnpm briefing:morning # Run and present local news and personal morning briefings
pnpm inbox:process    # Move reminders and Siri captures to Tasks and start independent research
```

## Architecture

Daily news briefings viewer — a single-page React app that fetches and renders structured JSON briefings by date.

The `briefings` repo now owns the deterministic ingestion pipeline in `scripts/news-briefing/`.

**Fetch stage:** `pnpm briefing:news` clears any generated files for the requested date, crawls the configured source homepages, extracts headline candidates locally, keeps the first 30 per source in page order, deduplicates by article URL, and writes compact metadata to `public/briefings/raw/YYYY-MM-DD.json` without fetching article pages.

**Synthesis stage:** The same command compares candidate files in `public/briefings/raw/` with final files in `public/briefings/`, invokes `pi` once to select stories from compact headline/URL metadata, fetches only those selected article bodies, writes the hydrated selection to `public/briefings/raw/YYYY-MM-DD-selection.json`, invokes `pi` again to summarize that selection, and writes the final app-facing JSON.

**App data flow:** On mount, fetches `/briefings/index.json` (array of `{date, title}` objects). Selecting a date fetches `/briefings/{YYYY-MM-DD}.json` — a structured JSON object with `sections[]`, each containing a `title` and `stories[]`. Each story has a `headline`, `body`, and `sources[]` (with `name` and `url`). The app renders these directly as React components.

**Pipeline files:** `scripts/news-briefing/` — source config, extraction helpers, candidate briefing builder, missing-briefing detection, synthesis helpers, and the repo-owned scheduler entrypoint. The local 07:00 morning entrypoint runs `pnpm briefing:news` concurrently with the personal briefing under one run lock, using `pi --provider openai-codex --model gpt-5.6-terra` with the local Codex login. There is no GitHub Actions news schedule. After news is generated and pushed, its separate T3 webhook creates a pinned `News briefing – YYYY-MM-DD` thread and unpins only older news threads. Its credential is `~/.config/morning-briefing/news-t3-webhook-url`, and its presentation prompt is `scripts/morning-briefing/prompts/news-presentation.prompt.md`. Either briefing can finish if the other fails; the scheduled command waits for both before releasing its lock.

**Morning briefing pipeline:** `scripts/morning-briefing/` — processes new inbox captures, extracts carryover from recent Obsidian daily notes, runs schedule, communications, work, and documents gather agents concurrently through `codex exec`, schema-checks and persists their results and JSONL events under `~/.local/state/morning-briefing/`, synthesizes one canonical Markdown briefing, atomically saves it to the daily note, waits for Obsidian Sync, then opens T3 Code and posts the date and daily note path to a T3 webhook task. That task starts a fresh thread that renames and pins itself, unpins older briefing threads, repeats the saved briefing exactly, and then queues one task-review of the Inbox. The webhook URL is a credential stored in `~/.config/morning-briefing/t3-webhook-url`; the task prompt lives in T3, not in this repo. The T3 relay holds the request until the app is online. The local LaunchAgent invokes the executable repo entrypoint at 07:00.

**Scan filing:** The `documents` lane files new family scans in Google Drive with the `file-scans` skill from dotfiles, which owns the naming rules and filing script, then reports scans that need Herb's attention. See `plans/005-scan-filing.md`.

**GitHub notifications:** The `work` lane marks GitHub notifications done when they need no input from Herb, such as closed or merged subjects and bot activity. It leaves the rest in the inbox and reports them so synthesis can turn them into tasks. It takes no other GitHub action.

**Siri inbox processing:** `scripts/inbox/` — runs hourly and before the morning briefing. It first moves every open reminder without a due date in the Apple Reminders list named Reminders straight into the Tasks Inbox through `scripts/inbox/reminders.swift` (EventKit; AppleScript takes over a minute per call), with no classification or research, and marks each reminder done only after its task is verified. Reminders with due dates stay in Reminders so the phone can still alert Herb. A read-only classifier interprets timestamped captures from Obsidian `inbox.md`; deterministic code deduplicates against Tasks, inserts or links the task, verifies the destination, and archives the original capture in `documents/inbox.archive.md`. Private journals and recovery snapshots live under `~/.local/state/inbox-processing/`. Each capture is identified by its original timestamp and text, so retries and sync replays reuse its verified transfer. Source rewrites preserve captures appended while an agent is working and check for intervening changes before replacing the file.

An independently locked worker processes relevant research in persistent Codex sessions with no fixed time limit. Research writes canonical subject notes in Obsidian; deterministic code verifies the note, refreshes the typed task or project, and links the canonical note and appends ordered next steps to its description. Questions and source metadata remain in Obsidian, with task backlinks and private journals used to find them. Failed task updates reuse verified research and reuse the original description request before appending missing steps. Findings and unresolved questions surface in the morning Inbox review. `pnpm inbox:process --dry-run` inspects paths and capture count without writes; `--research-worker` drains queued research. Intake logs to `/tmp/inbox-processing.log`; detached research logs to `/tmp/inbox-research.log`.

**Key app file:** `src/App.tsx` — contains all app logic: date state, fetching, keyboard navigation (Ctrl+D/P/N for today/prev/next), calendar popover for date selection. Types (`Briefing`, `Section`, `Story`, `Source`, `BriefingIndex`) are defined at the end of the file.

**UI components** in `src/components/ui/` are shadcn/ui primitives (calendar, popover, button, dropdown-menu) built on Radix UI.

**Styling:** Tailwind v4 via `@tailwindcss/vite` plugin. IBM Plex fonts (Serif for body, Sans for UI, Mono for code). Primary/accent color is orange-900 (`oklch(40.8% 0.123 38.172)`). Prose styles are in `src/App.css`.

**Class merging:** Use `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge), not string interpolation.

**Path alias:** `@/*` maps to `./src/*`.

See [Tasks integration](docs/tasks-integration.md) for the CLI binding, durable request journals and legacy source resolution.

## Windows automation

The always-on mini owns the daily 07:00 morning/news run through the interactive Windows task `Morning briefing` and `scripts/windows/runBriefingJob.ps1`. Its Pi provider is `openai`. Obsidian Sync is the mini's only notes-vault sync method, and browser communications use Agent Chrome on loopback9223. `Inbox intake` runs hourly through S4U; `Inbox research` runs independently without a fixed time limit. The Mac morning LaunchAgent is disabled. Its hourly `process-inbox` retains only deterministic Reminders transfer and Apple Messages export through the stable Full Disk Access launcher. See [Windows setup](docs/windows-briefing.md).

## Boundary with dotfiles

`dotfiles` should only own LaunchAgent wiring and thin shared skill wrappers. The news and morning pipeline code, prompts, schemas, intermediate-file conventions, and scheduler commands live in this repo.
