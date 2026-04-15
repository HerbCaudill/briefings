# Automate news briefing ingestion

## Goal

Move the deterministic news-ingestion pipeline into the `briefings` repo so raw daily inputs and final daily briefing JSON live together, while leaving only the scheduled cron/LaunchAgent wiring in `dotfiles`.

## Approach

Build a TypeScript pipeline in `briefings` with two stages:

1. **Fetch stage**: crawl the configured source homepages, extract headline candidates, take the first 30 per source in page order, fetch each unique article body, and persist one raw file per day at `public/briefings/raw/YYYY-MM-DD.json`.
2. **Synthesis stage**: detect raw files that do not yet have `public/briefings/YYYY-MM-DD.json`, invoke the `pi` CLI against the raw file with a much smaller prompt focused only on story selection and summarization, and write the final app-facing JSON.

Keep the extraction logic deterministic and local. The raw JSON should store one entry per unique article URL with source metadata, listing-page URL, first-seen position, headline text, and full extracted body text. The app continues to read final briefing JSON from `public/briefings/`, and the existing Vite index generation continues to work unchanged.

The `dotfiles` repo should keep only the scheduled runner setup. That scheduler should call a command in `briefings` that runs fetch first, then synthesizes any missing final briefings.

## Tasks

1. Add a `scripts/news-briefing/` TypeScript pipeline in `briefings` for source config, headline extraction, article extraction, fetch orchestration, raw JSON writing, and missing-briefing detection.
2. Define raw JSON types and file naming conventions for `public/briefings/raw/YYYY-MM-DD.json` and ensure output is stable and app-adjacent.
3. Add a summarization command that shells out to `pi`, passes the raw file path plus a minimized prompt, and writes `public/briefings/YYYY-MM-DD.json`.
4. Add a top-level command that runs the fetch stage and then synthesizes all missing briefings.
5. Add tests around extraction, deduplication, raw-file shaping, and missing-briefing detection.
6. Update repo docs to describe the new pipeline boundaries between `briefings` and `dotfiles`.
7. After the `briefings` work lands, simplify the shared `news-briefing` skill so it assumes pre-fetched raw JSON instead of doing the crawling itself.

## Unresolved Questions

- How much fetch-error metadata, if any, should be retained in the raw JSON beyond the successful article records?
- Whether article-fetch concurrency and retry limits should be configurable from the CLI or kept as internal constants.
