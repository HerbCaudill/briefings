# Briefings

A small React app for reading daily news briefings, plus the local TypeScript pipeline that fetches candidate stories and synthesizes the final JSON the app renders.

## Commands

```bash
pnpm dev             # Start the Vite app
pnpm build           # Type-check and build the app
pnpm lint            # Run ESLint
pnpm test            # Run Vitest
pnpm format          # Format the repo with Prettier
pnpm briefing        # Fetch today's candidate file, then synthesize missing final briefings
pnpm morning-briefing # Gather and publish today's personal morning briefing
```

The briefing command also accepts an optional date argument:

```bash
pnpm briefing 2026-04-20
```

## Data flow

The repo now owns the deterministic ingestion pipeline.

1. `pnpm briefing` clears any generated files for the requested date, crawls the configured homepages, extracts headline candidates, keeps the first 30 per source in page order, deduplicates by article URL, and writes a compact candidates file at `public/briefings/raw/YYYY-MM-DD.json`.
2. It compares `public/briefings/raw/YYYY-MM-DD.json` candidate files with `public/briefings/YYYY-MM-DD.json` final files, asks `pi` to select stories from headline/URL metadata, fetches only the selected article bodies, writes the hydrated selection to `public/briefings/raw/YYYY-MM-DD-selection.json`, then asks `pi` to write the final app-facing briefing JSON.
3. When final briefings are generated, it commits `public/briefings/index.json` plus the generated final, raw, and selection files, rebases, and pushes to the git remote.
4. The GitHub Actions scheduler invokes `pnpm briefing` daily at 5:00 AM UTC and can also be run manually from the Actions tab. The workflow uses `pi --provider openai --model gpt-5.6-terra`, so the repository needs an `OPENAI_API_KEY` secret.
5. The app reads `/briefings/index.json` and `/briefings/YYYY-MM-DD.json` as before.

## Candidate and selection files

Each candidate file stores one entry per unique article URL. Every article record includes `url`, `headline`, `source`, and `region`. Article pages are not fetched during the candidate stage.

During synthesis, only the URLs selected by the first `pi` pass are fetched and hydrated. The hydrated selection overwrites `public/briefings/raw/YYYY-MM-DD-selection.json`, so the pipeline has three durable stages: candidates, selection, and final briefing.

## Repo boundaries

`briefings` owns both briefing pipelines: news crawling, extraction, raw persistence, and final JSON generation under `scripts/news-briefing/`; and the private multi-agent morning workflow under `scripts/morning-briefing/`.

`dotfiles` should only own LaunchAgent wiring and thin shared skill wrappers. Scheduled commands live here.

## Personal morning briefing

`pnpm morning-briefing` runs a local workflow for the current Europe/Madrid date. An optional `YYYY-MM-DD` argument backfills another date, and `--dry-run` prints the planned lanes, destinations, and artifact paths without contacting sources or writing either destination.

The workflow extracts carryover from the three latest daily briefings, then runs three ephemeral Codex agents in parallel:

- schedule and Google Tasks;
- Gmail and messaging; and
- GitHub, meeting transcripts, and local agent sessions.

Each agent writes schema-constrained JSON plus its complete JSONL event stream. One final agent reads the merged results and creates a validated canonical `final.md`. The publisher atomically writes that exact briefing under `## Daily briefing` in `~/Code/herbcaudill/notes/daily/YYYY-MM-DD.md`, waits for Obsidian Sync, then creates a clean dated Codex task with the same content. It discovers the current Pinned sidebar section, pins the new task, and unpins older morning briefing presentation tasks.

Private artifacts never enter `public/` or Git. Each run has its own directory under `~/.local/state/morning-briefing/YYYY-MM-DD/`, including `carryover.md`, per-lane results and event logs, `merged.json`, synthesis attempts, `final.md`, the presentation event log, and `manifest.json`. A single-run lock prevents scheduled runs from overlapping.
