Present the news briefing for {{body.date}}, which the local pipeline has already saved to {{body.briefingPath}}. Read that JSON file. Do not gather sources, edit files, or rerun the pipeline.

1. Rename this thread to "News briefing – {{body.date}}" with t3_thread_update.
2. Pin this thread with t3_thread_organize. Then use t3_thread_list with titleContains "News briefing – " and unpin every other thread it returns. Keep morning briefing threads pinned.
3. Reply with the complete saved briefing as readable Markdown: its title, every section title, and every story's headline, body, and source links in the original order. Preserve the saved wording. Do not add commentary or an Inbox review.

If the file is missing or invalid, say so plainly and stop.
