# Morning briefing pipeline

## Goal

Move the morning briefing workflow into this repository so independent agents gather its sources in parallel, every stage leaves inspectable artifacts, and one validated briefing is published to both the Obsidian daily note and a clean pinned Codex task.

## Approach

Keep the 07:00 LaunchAgent in `dotfiles`, but make its command point to a repo-owned TypeScript entrypoint. Keep the shared `morning-briefing` skill as a thin manual wrapper around that command.

The repo-owned pipeline will create a timestamped run directory under `~/.local/state/morning-briefing/YYYY-MM-DD/`. A deterministic preflight extracts the relevant sections from the three latest daily briefings into a carryover artifact. Three ephemeral Codex agents then gather schedule and task context, communications, and work activity in parallel. Each agent returns a schema-checked JSON artifact and a JSONL event log. A final Codex pass reads those artifacts, applies the existing briefing rules, and returns one schema-checked Markdown document.

The publisher will validate the required headings before changing either destination. It will atomically replace or append the `## Daily briefing` section in the daily note, wait for Obsidian Sync, then create a clean dated Codex task containing the same saved section. It will pin the new task and unpin older morning briefing presentation tasks. A run manifest will record every completed stage and retain failures for diagnosis.

The coordinator will own every subprocess and wait for each one directly. It will not depend on conversational subagent wakeups. A single-run lock will prevent overlapping scheduled runs.

## Tasks

1. Add dated run paths, Europe/Madrid date handling, carryover extraction, atomic persistence, and daily-note section replacement.
2. Define the shared gather-result and synthesis-result schemas plus standalone prompts for the schedule, communications, work, and synthesis agents.
3. Add a Codex CLI runner that writes model output and JSONL events, then orchestrate the three gatherers concurrently with explicit failure artifacts.
4. Add final briefing validation, Obsidian publication and sync, and clean pinned-task presentation through Codex App Server.
5. Add focused tests for stage ordering, parallel gather behavior, carryover extraction, note preservation, schema validation, and presentation requests.
6. Add the repo command and documentation, then reduce the dotfiles skill and launcher path to thin wiring.
7. Run the full test, lint, format, build, and dry-run checks before committing and pushing both repositories.

## Unresolved questions

None. The first version preserves the current 07:00 schedule, uses GPT-5.6 Sol for source gathering and synthesis, and keeps only the newest dated briefing task pinned.
