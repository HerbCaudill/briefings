# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev             # Start dev server (Vite)
pnpm build           # Type-check + build (tsc -b && vite build)
pnpm lint            # ESLint
pnpm preview         # Preview production build
pnpm test            # Vitest
pnpm format          # Prettier
pnpm news:fetch      # Fetch raw daily source material into public/briefings/raw/
pnpm news:synthesize # Generate missing final briefings from raw files
pnpm news:run        # Fetch today, then synthesize any missing final briefings
```

## Architecture

Daily news briefings viewer — a single-page React app that fetches and renders structured JSON briefings by date.

The `briefings` repo now owns the deterministic ingestion pipeline in `scripts/news-briefing/`.

**Fetch stage:** `pnpm news:fetch` crawls the configured source homepages, extracts headline candidates locally, keeps the first 30 per source in page order, fetches article bodies, deduplicates by article URL, and writes `public/briefings/raw/YYYY-MM-DD.json`.

**Synthesis stage:** `pnpm news:synthesize` compares raw files in `public/briefings/raw/` with final files in `public/briefings/`, invokes `pi` with a reduced prompt for each missing date, and writes the final app-facing JSON.

**App data flow:** On mount, fetches `/briefings/index.json` (array of `{date, title}` objects). Selecting a date fetches `/briefings/{YYYY-MM-DD}.json` — a structured JSON object with `sections[]`, each containing a `title` and `stories[]`. Each story has a `headline`, `body`, and `sources[]` (with `name` and `url`). The app renders these directly as React components.

**Pipeline files:** `scripts/news-briefing/` — source config, extraction helpers, raw briefing builder, missing-briefing detection, and synthesis entrypoints.

**Key app file:** `src/App.tsx` — contains all app logic: date state, fetching, keyboard navigation (Ctrl+D/P/N for today/prev/next), calendar popover for date selection. Types (`Briefing`, `Section`, `Story`, `Source`, `BriefingIndex`) are defined at the end of the file.

**UI components** in `src/components/ui/` are shadcn/ui primitives (calendar, popover, button, dropdown-menu) built on Radix UI.

**Styling:** Tailwind v4 via `@tailwindcss/vite` plugin. IBM Plex fonts (Serif for body, Sans for UI, Mono for code). Primary/accent color is orange-900 (`oklch(40.8% 0.123 38.172)`). Prose styles are in `src/App.css`.

**Class merging:** Use `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge), not string interpolation.

**Path alias:** `@/*` maps to `./src/*`.

## Boundary with dotfiles

`dotfiles` should only own the scheduled runner and the shared `news-briefing` skill wrapper. The fetch/extract pipeline and raw daily files live in this repo.
