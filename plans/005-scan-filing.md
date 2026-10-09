# Scan filing in the morning briefing

## Goal

File new family scans automatically each morning and surface any that need Herb's attention in the briefing.

## Approach

The `file-scans` skill in dotfiles owns the naming rules, merge and split policy, Drive workarounds, and the `applyFilingPlan.ts` script. This pipeline only schedules it and reports on it, matching the boundary in `AGENTS.md`.

Filing reuses the gather-lane machinery as a fourth lane, `documents`, with one source, `Scanned documents`. The shared gather prompt now allows a write action only when a lane's own prompt assigns one, and `documents.prompt.md` assigns exactly one: file new scans with the skill's unattended mode. Herb chose full autonomy: the agent applies every proposal, including merges, splits, and duplicate deletions, without waiting for approval. Mistakes are recoverable from `.filing-log.jsonl` and Drive's trash for 30 days.

The filing agent has already read every new document, so it also judges what needs attention: payment demands, fines, deadlines, appointments, tax and legal notices, and anything it filed with low confidence. Synthesis puts those under Open issues and can draft Tasks Inbox items through the existing `newTasks` path. Routine filing is not mentioned. A run with no new scans reports `covered` with an empty report.

A filing failure does not block the briefing: the lane machinery retries once and then records an `incomplete` source with the cause, leaving unfiled scans in the inbox for the next run.

Alternatives considered: a separate pipeline stage beside the lanes (rejected: it would duplicate the lanes' retry, schema, and fallback handling); a separate LaunchAgent for filing (rejected: two schedules to keep in step, and the briefing would have to rediscover what was filed); a read-only lane that only proposes names (rejected by Herb in favor of autonomy).

## Tasks

1. **Unattended mode in the skill (dotfiles).** Add a section to `file-scans/SKILL.md` for scheduled runs: apply the full plan without review, keep uncertain items flagged rather than skipped, never overwrite, use the Drive API fallback for stalled files, and return a report of actions and attention items. Accept a plan file anywhere on disk and print a machine-readable summary from `applyFilingPlan.ts` if the report needs it.
2. **Documents lane (briefings).** Add the lane, its prompt, the write exception in the shared gather prompt, and the synthesis guidance for Sources, Open issues, and new tasks.
3. **Verify.** Run the documents lane live against the real scans folder and check its gather artifact.

## Unresolved questions

None.
