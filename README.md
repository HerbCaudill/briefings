# Briefings

A small React app for reading daily news briefings, plus the local TypeScript pipeline that fetches candidate stories and synthesizes the final JSON the app renders.

## Commands

```bash
pnpm dev             # Start the Vite app
pnpm build           # Type-check and build the app
pnpm lint            # Run ESLint
pnpm test            # Run Vitest
pnpm format          # Format the repo with Prettier
pnpm briefing:news    # Fetch today's candidate file, then synthesize missing final briefings
pnpm briefing:morning # Run news and personal briefings; publish two pinned T3 sessions
pnpm briefing:location # Print barcelona, tamariu, or other from Backtrack's latest row
```

The briefing command also accepts an optional date argument:

```bash
pnpm briefing:news 2026-04-20
```

## Data flow

The repo now owns the deterministic ingestion pipeline.

1. `pnpm briefing:news` clears any generated files for the requested date, crawls the configured homepages, extracts headline candidates, keeps the first 30 per source in page order, deduplicates by article URL, and writes a compact candidates file at `public/briefings/raw/YYYY-MM-DD.json`.
2. It compares `public/briefings/raw/YYYY-MM-DD.json` candidate files with `public/briefings/YYYY-MM-DD.json` final files, asks `pi` to select stories from headline/URL metadata, fetches only the selected article bodies, writes the hydrated selection to `public/briefings/raw/YYYY-MM-DD-selection.json`, then asks `pi` to write the final app-facing briefing JSON.
3. When final briefings are generated, it commits `public/briefings/index.json` plus the generated final, raw, and selection files, rebases, and pushes to the git remote.
4. The local 07:00 morning LaunchAgent invokes `pnpm briefing:morning`, which runs news and the personal briefing concurrently under one run lock. News uses `pi --provider openai-codex --model gpt-5.6-terra` with the locally saved Codex login, then presents the saved JSON in a separate pinned T3 thread. GitHub Actions no longer schedules news.
5. The app reads `/briefings/index.json` and `/briefings/YYYY-MM-DD.json` as before.

## Candidate and selection files

Each candidate file stores one entry per unique article URL. Every article record includes `url`, `headline`, `source`, and `region`. Article pages are not fetched during the candidate stage.

During synthesis, only the URLs selected by the first `pi` pass are fetched and hydrated. The hydrated selection overwrites `public/briefings/raw/YYYY-MM-DD-selection.json`, so the pipeline has three durable stages: candidates, selection, and final briefing.

## Repo boundaries

`briefings` owns both briefing pipelines: news crawling, extraction, raw persistence, and final JSON generation under `scripts/news-briefing/`; and the private multi-agent morning workflow under `scripts/morning-briefing/`.

`dotfiles` should only own LaunchAgent wiring and thin shared skill wrappers. Scheduled commands live here.

## Personal morning briefing

`pnpm briefing:morning` runs both briefings locally for the current date in the machine's time zone. An optional `YYYY-MM-DD` argument backfills another date, and `--dry-run` prints the time zone, planned lanes, destinations, and artifact paths without contacting sources or writing any destination. News runs from the repository directory even when LaunchAgent starts elsewhere. Each briefing finishes and presents independently; the command waits for both and reports any failures.

The workflow extracts carryover from the three latest daily briefings, then runs three ephemeral Codex agents in parallel:

- schedule and the Tasks board;
- Gmail and messaging; and
- GitHub, meeting transcripts, and local agent sessions.

The schedule agent uses `pnpm --silent briefing:location` for last-known place context. The command reads Backtrack's iCloud CSV and compares its final row with approximate boxes for Barcelona (latitude 41.32–41.48, longitude 2.05–2.23) and Tamariu (latitude 41.90–41.93, longitude 3.19–3.23). It returns `other` outside both boxes. It does not interpret timestamps or apply an age cutoff. A missing or invalid file causes the command to fail; the briefing continues without location context. An optional file-path argument lets you read another Backtrack CSV.

Each agent writes schema-constrained JSON plus its complete JSONL event stream. One final agent reads the merged results and creates a validated canonical `final.md`. The publisher atomically writes that exact briefing under `## Daily briefing` in `~/Code/herbcaudill/notes/daily/YYYY-MM-DD.md`, waits for Obsidian Sync, then posts the saved note path to the morning T3 webhook. The news branch posts the saved JSON path to a separate news webhook. Each task creates and pins its own dated thread and unpins only older threads of the same kind. The morning thread alone begins the Inbox review. Webhook credentials live in `~/.config/morning-briefing/t3-webhook-url` and `~/.config/morning-briefing/news-t3-webhook-url`; the news presentation prompt is versioned in `scripts/morning-briefing/prompts/news-presentation.prompt.md`.

Private artifacts never enter `public/` or Git. Each run has its own directory under `~/.local/state/morning-briefing/YYYY-MM-DD/`, including `carryover.md`, per-lane results and event logs, `merged.json`, synthesis attempts, `final.md`, the presentation event log, and `manifest.json`. A single-run lock prevents scheduled runs from overlapping.

Task capture, research publication and duplicate detection use the managed Tasks CLI. See [Tasks integration](docs/tasks-integration.md) for the enrolled-space binding, journal recovery and legacy-history rules.
