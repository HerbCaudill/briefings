import path from "node:path"
import type { Plugin } from "vite"
import { generateBriefingIndex } from "./scripts/news-briefing/generateBriefingIndex.ts"

/** Vite plugin that generates `public/briefings/index.json` from the briefing files on disk. */
export function briefingIndex(): Plugin {
  const briefingsDir = path.resolve(__dirname, "public/briefings")

  return {
    name: "briefing-index",

    /** Generate on dev server start and before production build. */
    buildStart() {
      generateBriefingIndex(briefingsDir)
    },

    /** Regenerate when briefing files change during dev. */
    handleHotUpdate({ file }) {
      if (file.startsWith(briefingsDir) && file.endsWith(".json") && !file.endsWith("index.json")) generateBriefingIndex(briefingsDir)
    },
  }
}
