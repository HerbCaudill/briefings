# News briefing automation tasks

- [ ] Create `scripts/news-briefing/` structure in TypeScript for source config, fetching, extraction, raw persistence, and synthesis orchestration.
- [ ] Define raw JSON types for `public/briefings/raw/YYYY-MM-DD.json` with unique articles, source metadata, first-seen position, and full body text.
- [ ] Port or adapt the existing headline/article extraction logic into the `briefings` repo.
- [ ] Implement homepage fetch + first-30-per-source selection in page order.
- [ ] Deduplicate by article URL while preserving where each article was seen.
- [ ] Fetch article bodies for each selected unique URL and persist one daily raw file.
- [ ] Implement missing-briefing detection by comparing `public/briefings/raw/*.json` to `public/briefings/*.json`.
- [ ] Implement `pi` CLI invocation that reads a raw file and writes the final briefing JSON.
- [ ] Add a single command that fetches raw data and then generates any missing briefings.
- [ ] Add unit tests for extraction, deduplication, raw shaping, and missing-briefing detection.
- [ ] Update `README.md` and `CLAUDE.md` in `briefings` to document the new pipeline.
- [ ] Follow up in `dotfiles` to keep only cron/LaunchAgent creation and point it at the new `briefings` command.
