## Commands

```bash
pnpm dev             # Start dev server (Vite)
pnpm build           # Type-check + build (tsc -b && vite build)
pnpm lint            # ESLint
pnpm preview         # Preview production build
pnpm test            # Vitest
pnpm format          # Prettier
pnpm briefing        # Fetch today, then synthesize any missing final briefings
```

## Architecture

Daily news briefings viewer — a single-page React app that fetches and renders structured JSON briefings by date.

The `briefings` repo now owns the deterministic ingestion pipeline in `scripts/news-briefing/`.

**Fetch stage:** `pnpm briefing` clears any generated files for the requested date, crawls the configured source homepages, extracts headline candidates locally, keeps the first 30 per source in page order, deduplicates by article URL, and writes compact metadata to `public/briefings/raw/YYYY-MM-DD.json` without fetching article pages.

**Synthesis stage:** The same command compares candidate files in `public/briefings/raw/` with final files in `public/briefings/`, invokes `pi` once to select stories from compact headline/URL metadata, fetches only those selected article bodies, writes the hydrated selection to `public/briefings/raw/YYYY-MM-DD-selection.json`, invokes `pi` again to summarize that selection, and writes the final app-facing JSON.

**App data flow:** On mount, fetches `/briefings/index.json` (array of `{date, title}` objects). Selecting a date fetches `/briefings/{YYYY-MM-DD}.json` — a structured JSON object with `sections[]`, each containing a `title` and `stories[]`. Each story has a `headline`, `body`, and `sources[]` (with `name` and `url`). The app renders these directly as React components.

**Pipeline files:** `scripts/news-briefing/` — source config, extraction helpers, candidate briefing builder, missing-briefing detection, synthesis helpers, and the repo-owned scheduler entrypoint. `.github/workflows/daily-briefing.yml` runs `pnpm briefing` daily at 5:00 AM UTC, supports manual dispatch, and uses `pi --provider openai-codex --model gpt-5.4-mini` with the `OPENAI_API_KEY` repository secret.

**Key app file:** `src/App.tsx` — contains all app logic: date state, fetching, keyboard navigation (Ctrl+D/P/N for today/prev/next), calendar popover for date selection. Types (`Briefing`, `Section`, `Story`, `Source`, `BriefingIndex`) are defined at the end of the file.

**UI components** in `src/components/ui/` are shadcn/ui primitives (calendar, popover, button, dropdown-menu) built on Radix UI.

**Styling:** Tailwind v4 via `@tailwindcss/vite` plugin. IBM Plex fonts (Serif for body, Sans for UI, Mono for code). Primary/accent color is orange-900 (`oklch(40.8% 0.123 38.172)`). Prose styles are in `src/App.css`.

**Class merging:** Use `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge), not string interpolation.

**Path alias:** `@/*` maps to `./src/*`.

## Boundary with dotfiles

`dotfiles` should only own the LaunchAgent wiring and the shared `news-briefing` skill wrapper. The fetch/extract pipeline, candidate daily files, and the scheduler command (`pnpm briefing`) live in this repo.
