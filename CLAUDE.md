## Commands

```bash
pnpm dev             # Start dev server (Vite)
pnpm build           # Type-check + build (tsc -b && vite build)
pnpm lint            # ESLint
pnpm preview         # Preview production build
pnpm test            # Vitest
pnpm format          # Prettier
pnpm briefing:news    # Fetch today, then synthesize any missing final briefings
pnpm briefing:morning # Gather and publish today's personal morning briefing
pnpm inbox:process    # Transfer Siri captures and start independent research
```

## Architecture

Daily news briefings viewer — a single-page React app that fetches and renders structured JSON briefings by date.

The `briefings` repo now owns the deterministic ingestion pipeline in `scripts/news-briefing/`.

**Fetch stage:** `pnpm briefing:news` clears any generated files for the requested date, crawls the configured source homepages, extracts headline candidates locally, keeps the first 30 per source in page order, deduplicates by article URL, and writes compact metadata to `public/briefings/raw/YYYY-MM-DD.json` without fetching article pages.

**Synthesis stage:** The same command compares candidate files in `public/briefings/raw/` with final files in `public/briefings/`, invokes `pi` once to select stories from compact headline/URL metadata, fetches only those selected article bodies, writes the hydrated selection to `public/briefings/raw/YYYY-MM-DD-selection.json`, invokes `pi` again to summarize that selection, and writes the final app-facing JSON.

**App data flow:** On mount, fetches `/briefings/index.json` (array of `{date, title}` objects). Selecting a date fetches `/briefings/{YYYY-MM-DD}.json` — a structured JSON object with `sections[]`, each containing a `title` and `stories[]`. Each story has a `headline`, `body`, and `sources[]` (with `name` and `url`). The app renders these directly as React components.

**Pipeline files:** `scripts/news-briefing/` — source config, extraction helpers, candidate briefing builder, missing-briefing detection, synthesis helpers, and the repo-owned scheduler entrypoint. `.github/workflows/daily-briefing.yml` runs `pnpm briefing:news` daily at 5:00 AM UTC, supports manual dispatch, and uses `pi --provider openai --model gpt-5.6-terra` with the `OPENAI_API_KEY` repository secret.

**Morning briefing pipeline:** `scripts/morning-briefing/` — processes new inbox captures, extracts carryover from recent Obsidian daily notes, runs schedule, communications, and work gather agents concurrently through `codex exec`, schema-checks and persists their results and JSONL events under `~/.local/state/morning-briefing/`, synthesizes one canonical Markdown briefing, atomically saves it to the daily note, waits for Obsidian Sync, and creates a pinned Codex session. After verifying the exact briefing, a second turn invokes task-review once with `listNames: ["Inbox", "Today"]` and asks the first useful question. If the interview kickoff fails, the verified briefing remains pinned. The local LaunchAgent invokes the executable repo entrypoint at 07:00.

**Siri inbox processing:** `scripts/inbox/` — runs hourly and before the morning briefing. A read-only classifier interprets timestamped captures from Obsidian `inbox.md`; deterministic code deduplicates against Google Tasks, inserts or links the task, verifies the destination, and archives the original capture in `Inbox archive.md`. Private journals and recovery snapshots live under `~/.local/state/inbox-processing/`. Each capture is identified by its original timestamp and text, so retries and sync replays reuse its verified transfer. Source rewrites preserve captures appended while an agent is working and check for intervening changes before replacing the file.

An independently locked worker processes relevant research in persistent Codex sessions with no fixed time limit. Research writes canonical subject notes in Obsidian; deterministic code verifies the note, refreshes the task's current location, and adds only a useful operational next step. Questions and source metadata remain in Obsidian, with task backlinks and private journals used to find them. Failed task updates reuse verified research. Findings and unresolved questions surface in the morning Inbox review. `pnpm inbox:process --dry-run` inspects paths and capture count without writes; `--research-worker` drains queued research. Intake logs to `/tmp/inbox-processing.log`; detached research logs to `/tmp/inbox-research.log`.

**Key app file:** `src/App.tsx` — contains all app logic: date state, fetching, keyboard navigation (Ctrl+D/P/N for today/prev/next), calendar popover for date selection. Types (`Briefing`, `Section`, `Story`, `Source`, `BriefingIndex`) are defined at the end of the file.

**UI components** in `src/components/ui/` are shadcn/ui primitives (calendar, popover, button, dropdown-menu) built on Radix UI.

**Styling:** Tailwind v4 via `@tailwindcss/vite` plugin. IBM Plex fonts (Serif for body, Sans for UI, Mono for code). Primary/accent color is orange-900 (`oklch(40.8% 0.123 38.172)`). Prose styles are in `src/App.css`.

**Class merging:** Use `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge), not string interpolation.

**Path alias:** `@/*` maps to `./src/*`.

## Boundary with dotfiles

`dotfiles` should only own LaunchAgent wiring and thin shared skill wrappers. The news and morning pipeline code, prompts, schemas, intermediate-file conventions, and scheduler commands live in this repo.
