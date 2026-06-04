# News Briefing Effect Refactor

## Goal

Refactor the news-briefing scripts to reduce duplicated workflow plumbing, improve validation and error handling, and use Effect where it adds clear value.

## Approach

Keep pure parsing and formatting helpers as ordinary functions. Use Effect at the edges of the pipeline: filesystem access, subprocess execution, fetching, retries, concurrency, logging, timing, and JSON validation.

Start with a small schema and infrastructure layer so the current scripts can keep working while internals improve. Then migrate the fetch, selection, hydration, synthesis, and commit/push stages into composable Effects. Finally, simplify headline extraction and fix the lost RSS body data path.

Avoid a full rewrite. Each step should preserve existing command behavior and be covered by unit tests where behavior changes or becomes safer.

## Tasks

1. Add Effect and schema dependencies, then define schemas for raw briefings, selection output, hydrated selections, source configs, and generated briefing files.
2. Replace untyped JSON parsing with schema-backed decoding and clear parse errors for raw files and pi output.
3. Create shared path helpers for raw briefing, selection, final briefing, and generated commit paths.
4. Create shared runtime services for filesystem, HTTP fetching, process execution, pi execution, git commands, clock, and logging.
5. Convert retry and bounded concurrency to Effect-native `Schedule` and `Effect.forEach` behavior, then remove local duplicate helpers where possible.
6. Refactor `buildRawBriefing` into smaller pure source-selection helpers plus an Effect-backed persistence boundary.
7. Preserve RSS-provided article bodies when building raw briefings so hydration can skip unnecessary article fetches.
8. Refactor `synthesizeBriefing` into explicit selection, hydration, and synthesis Effects with shared logging/timing helpers.
9. Refactor `runNewsBriefingPipeline` to compose Effects for clear, fetch, synthesize missing dates, commit, pull, and push.
10. Consolidate CLI wiring in `run.ts`, `fetch.ts`, and `synthesize.ts` around one shared live runtime configuration.
11. Simplify `extractHeadlineCandidates` by extracting pure helpers for candidate construction, URL resolution, headline validation, and candidate deduplication.
12. Normalize article paragraph extraction through the same text cleanup path used by headline extraction, including HTML entity decoding.
13. Update tests to cover schema failures, preserved RSS bodies, path generation, Effect retry/concurrency behavior, and unchanged CLI-facing behavior.
14. Update README/CLAUDE guidance if the briefing workflow or required setup changes.

## Unresolved Questions

- Should generated briefing JSON files be schema-validated before they are written, or only raw/selection inputs?
- Should `commitAndPushGeneratedBriefings` continue to always run `git pull --rebase` and `git push`, or should that remain a top-level pipeline responsibility?
- Should the initial refactor keep the existing `fetch.ts` and `synthesize.ts` entrypoints, or collapse them into subcommands later?
