# Briefings

A small React app for reading daily news briefings, plus the local TypeScript pipeline that fetches raw source material and synthesizes the final JSON the app renders.

## Commands

```bash
pnpm dev             # Start the Vite app
pnpm build           # Type-check and build the app
pnpm lint            # Run ESLint
pnpm test            # Run Vitest
pnpm format          # Format the repo with Prettier
pnpm news:fetch      # Fetch source pages and write public/briefings/raw/YYYY-MM-DD.json
pnpm news:synthesize # Generate missing final briefing JSON from raw files
pnpm news:run        # Fetch today's raw file, then synthesize any missing final briefings
```

Each news command also accepts an optional date argument:

```bash
pnpm news:fetch 2026-04-20
pnpm news:synthesize 2026-04-20
pnpm news:run 2026-04-20
```

## Data flow

The repo now owns the deterministic ingestion pipeline.

1. `pnpm news:fetch` crawls the configured homepages, extracts headline candidates, keeps the first 30 per source in page order, deduplicates by article URL, and writes a compact raw file at `public/briefings/raw/YYYY-MM-DD.json`.
2. `pnpm news:synthesize` compares `public/briefings/raw/*.json` with `public/briefings/*.json`, asks `pi` to select stories from headline/URL metadata, fetches only the selected article bodies, then asks `pi` to write the final app-facing briefing JSON.
3. `pnpm news:run` is the repo-owned scheduler command: it fetches the requested day first, then synthesizes every missing final briefing.
4. The app reads `/briefings/index.json` and `/briefings/YYYY-MM-DD.json` as before.

## Raw briefing format

Each raw daily file stores one entry per unique article URL. Every article record includes:

- `url`
- `headline`
- `body` when it was available from a listing feed, otherwise an empty string
- `source` metadata for the first sighting
- `listingPageUrl`
- `firstSeenPosition`
- `sightings[]` showing every homepage/listing where that URL appeared

Article pages are not fetched during the raw stage. During synthesis, only the URLs selected by the first `pi` pass are fetched and hydrated before final summarization.

## Repo boundaries

`briefings` owns crawling, extraction, raw persistence, final JSON generation, and the scheduler command itself (`pnpm news:run`).

`dotfiles` should only own the LaunchAgent wiring that invokes the repo-owned scheduler command, plus any thin shared `news-briefing` skill description that assumes raw files already exist.
