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
```

The briefing command also accepts an optional date argument:

```bash
pnpm briefing 2026-04-20
```

## Data flow

The repo now owns the deterministic ingestion pipeline.

1. `pnpm briefing` clears any generated files for the requested date, crawls the configured homepages, extracts headline candidates, keeps the first 30 per source in page order, deduplicates by article URL, and writes a compact candidates file at `public/briefings/raw/YYYY-MM-DD.json`.
2. It compares `public/briefings/raw/YYYY-MM-DD.json` candidate files with `public/briefings/YYYY-MM-DD.json` final files, asks `pi` to select stories from headline/URL metadata, fetches only the selected article bodies, writes the hydrated selection to `public/briefings/raw/YYYY-MM-DD-selection.json`, then asks `pi` to write the final app-facing briefing JSON.
3. The repo-owned scheduler should invoke `pnpm briefing`, optionally with a date argument.
4. The app reads `/briefings/index.json` and `/briefings/YYYY-MM-DD.json` as before.

## Candidate and selection files

Each candidate file stores one entry per unique article URL. Every article record includes `url`, `headline`, `source`, and `region`. Article pages are not fetched during the candidate stage.

During synthesis, only the URLs selected by the first `pi` pass are fetched and hydrated. The hydrated selection overwrites `public/briefings/raw/YYYY-MM-DD-selection.json`, so the pipeline has three durable stages: candidates, selection, and final briefing.

## Repo boundaries

`briefings` owns crawling, extraction, raw persistence, final JSON generation, and the scheduler command itself (`pnpm briefing`).

`dotfiles` should only own the LaunchAgent wiring that invokes the repo-owned scheduler command, plus any thin shared `news-briefing` skill description that assumes candidate files already exist.
