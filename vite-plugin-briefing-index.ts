import { readdirSync, writeFileSync } from "fs"
import path from "path"
import type { Plugin } from "vite"

/** Vite plugin that generates `public/briefings/index.json` from the briefing files on disk. */
export function briefingIndex(): Plugin {
  const briefingsDir = path.resolve(__dirname, "public/briefings")

  return {
    name: "briefing-index",

    /** Generate on dev server start and before production build. */
    buildStart() {
      generateIndex(briefingsDir)
    },

    /** Regenerate when briefing files change during dev. */
    handleHotUpdate({ file }) {
      if (file.startsWith(briefingsDir) && file.endsWith(".json") && !file.endsWith("index.json")) {
        generateIndex(briefingsDir)
      }
    },
  }
}

/** Scan briefing JSON files and write index.json. */
function generateIndex(dir: string) {
  const datePattern = /^\d{4}-\d{2}-\d{2}\.json$/
  const files = readdirSync(dir).filter(f => datePattern.test(f)).sort().reverse()

  const index = files.map(f => {
    const date = f.replace(".json", "")
    return { date, title: formatTitle(date) }
  })

  writeFileSync(path.join(dir, "index.json"), JSON.stringify(index, null, 2) + "\n")
}

/** Format a date string as "Daily Briefing — Wednesday, March 25, 2026". */
function formatTitle(dateStr: string) {
  const date = new Date(dateStr + "T12:00:00") // noon to avoid timezone issues
  const formatted = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  return `Daily Briefing — ${formatted}`
}
