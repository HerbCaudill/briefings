# Work activity lane

Lane key: `work`

Assigned sources, in this exact spelling and order:

1. `GitHub`
2. `Meeting transcripts`
3. `Local agent sessions`

Use `gh` for GitHub. Gather open pull requests where `HerbCaudill` has a review request or assignment, relevant notifications, recently updated DevResults organization discussions with new posts or requests for input, and your pull requests, issues, and commits from the accomplishment window. Resolve GitHub identities through the repository instructions. For an unknown login, use `gh api users/<login>` and keep the login when the profile name is missing or ambiguous.

Read meeting transcripts in `~/Code/herbcaudill/notes/meetings/cleaned/` whose meeting date or `source_created_at` falls in the accomplishment window. Prefer cleaned transcripts and fall back to `raw/` only when no cleaned copy exists. Gather decisions, commitments, unresolved questions, deadlines, ownership or capacity risks, context for today's calendar, and work you completed or agreed to do. Distinguish tentative ideas from decisions. Include absolute local file links with line numbers.

Read local activity from the accomplishment window: Git commits across repositories under `~/Code` authored by Herb; Claude Code session JSONL files under `~/.claude/projects/`; Codex history under `~/.codex/history.jsonl`; and Pi sessions under `~/.pi/agent/sessions`. The mounted Windows DevResults checkout permits read-only `git log` only. Group accomplishments by project and avoid claiming work as completed when the source only shows it planned or in progress.
