# Automate news briefing ingestion

## Goal

Move the deterministic news-ingestion pipeline into the `briefings` repo so raw daily inputs, final daily briefing JSON, and the scheduler-invocation script live together, while leaving only the LaunchAgent wiring in `dotfiles`.

## Approach

Build a TypeScript pipeline in `briefings` with two stages:

1. **Fetch stage**: crawl the configured source homepages, extract headline candidates, take the first 30 per source in page order, fetch each unique article body, and persist one raw file per day at `public/briefings/raw/YYYY-MM-DD.json`. Retain only successful article records in the raw JSON; do not store fetch-error metadata.
2. **Synthesis stage**: detect raw files that do not yet have `public/briefings/YYYY-MM-DD.json`, invoke the `pi` CLI against the raw file with a much smaller prompt focused only on story selection and summarization, and write the final app-facing JSON.

Keep the extraction logic deterministic and local. The raw JSON should store one entry per unique article URL with source metadata, listing-page URL, first-seen position, headline text, and full extracted body text. Article-fetch concurrency and retry limits should stay as internal constants rather than CLI options. The app continues to read final briefing JSON from `public/briefings/`, and the existing Vite index generation continues to work unchanged.

The `dotfiles` repo should keep only the LaunchAgent setup. The scheduled command it invokes should be defined in `briefings`, where it can run fetch first and then synthesize any missing final briefings.

## Tasks

1. Add a `scripts/news-briefing/` TypeScript pipeline in `briefings` for source config, headline extraction, article extraction, fetch orchestration, raw JSON writing, and missing-briefing detection.
2. Define raw JSON types and file naming conventions for `public/briefings/raw/YYYY-MM-DD.json` and ensure output is stable and app-adjacent.
3. Add a summarization command that shells out to `pi`, passes the raw file path plus a minimized prompt, and writes `public/briefings/YYYY-MM-DD.json`.
4. Add a repo-local scheduled-runner script/command that runs the fetch stage and then synthesizes all missing briefings.
5. Add tests around extraction, deduplication, raw-file shaping, missing-briefing detection, and the scheduled-runner entrypoint.
6. Update repo docs to describe the new pipeline boundaries between `briefings` and `dotfiles`, including that `dotfiles` only points LaunchAgent at the repo-owned scheduler command.
7. After the `briefings` work lands, simplify the shared `news-briefing` skill so it assumes pre-fetched raw JSON instead of doing the crawling itself.
