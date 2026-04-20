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

1. `pnpm news:fetch` crawls the configured homepages, extracts headline candidates, keeps the first 30 per source in page order, fetches each unique article body, and writes a raw file at `public/briefings/raw/YYYY-MM-DD.json`.
2. `pnpm news:synthesize` compares `public/briefings/raw/*.json` with `public/briefings/*.json`, runs `pi` against each missing raw file with a reduced summarization prompt, and writes the final app-facing briefing JSON.
3. The app reads `/briefings/index.json` and `/briefings/YYYY-MM-DD.json` as before.

## Raw briefing format

Each raw daily file stores one entry per unique article URL. Every article record includes:

- `url`
- `headline`
- `body`
- `source` metadata for the first sighting
- `listingPageUrl`
- `firstSeenPosition`
- `sightings[]` showing every homepage/listing where that URL appeared

This keeps extraction deterministic and local while leaving only story selection and summarization to `pi`.

## Repo boundaries

`briefings` owns crawling, extraction, raw persistence, and final JSON generation.

`dotfiles` should only own the scheduler wiring and the thin shared `news-briefing` skill description that assumes raw files already exist.
