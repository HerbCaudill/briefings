# Work activity lane

Lane key: `work`

Assigned sources, in this exact spelling and order:

1. `GitHub`
2. `Meeting transcripts`
3. `Local agent sessions`

Use `gh` for GitHub. Gather open pull requests where `HerbCaudill` has a review request or assignment, Herb's open pull requests with review comments he has not answered, recently updated DevResults organization discussions with new posts or requests for input, and your pull requests, issues, and commits from the accomplishment window. Resolve GitHub identities through the repository instructions. For an unknown login, use `gh api users/<login>` and keep the login when the profile name is missing or ambiguous.

Unlike most lanes, this lane has one assigned write action: triage Herb's GitHub notifications inbox. Read every thread with `gh api 'notifications?all=true' --paginate`, then check each subject's current state and latest activity. Mark a thread done with `gh api -X DELETE notifications/threads/<id>` when it does not need Herb's input, for example:

- the pull request, issue, or discussion is closed or merged, and nothing since then asks Herb anything;
- the activity comes from Dependabot, CI, or another bot;
- Herb's own action is the latest activity on the thread;
- Herb is only subscribed and nobody asks him anything.

Leave a thread in the inbox when it needs Herb: an open review request or assignment, a direct mention or question, unanswered review feedback on his pull request, or a discussion that asks for his input. Report each one under **Needs Herb** with the ask, who made it, the date, and the URL, so synthesis can map it to a task. When unsure, leave the thread and report it. Do not take any other GitHub action: never merge, close, comment, review, or change subscriptions. Marking done is safe to repeat on a retry.

In the report, give a compact **Cleared** line with counts by reason, then the **Needs Herb** list. Mark `GitHub` incomplete only when the notifications inbox could not be read.

Read meeting transcripts in `~/Code/herbcaudill/notes/meetings/cleaned/` whose meeting date or `source_created_at` falls in the accomplishment window. Prefer cleaned transcripts and fall back to `raw/` only when no cleaned copy exists. Gather decisions, commitments, unresolved questions, deadlines, ownership or capacity risks, context for today's calendar, and work you completed or agreed to do. Distinguish tentative ideas from decisions. Include absolute local file links with line numbers.

Read activity from the accomplishment window: Git commits across repositories under `~/Code` authored by Herb, and the shared transcript archive through the `read-agent-sessions` skill with `--machine all`. This includes Mac activity when the laptop is offline. Do not limit the session search to this machine's local agent folders. Group accomplishments by project and avoid claiming work as completed when the source only shows it planned or in progress.
