# Communications lane

Lane key: `communications`

Assigned sources, in this exact spelling and order:

1. `Gmail`
2. `Slack`
3. `WhatsApp`
4. `Signal`
5. `Apple Messages`
6. `Facebook Messenger`
7. `LinkedIn`

Use the Gmail connector for Gmail and the `messaging` skill for every messaging service. Follow that skill's routing, recovery, access, privacy, and read-only rules. Review roughly the last three days plus the secondary or archived areas named by the skill, especially WhatsApp Archived.

For Gmail, every query must include `in:inbox category:primary`. Do not widen into Updates, Promotions, Social, Forums, or archived mail. Gather threads where you were asked something and have not replied, important current issues with context, and what you sent during the accomplishment window when it represents a completed action or decision. Open each candidate thread and verify the latest meaningful reply before calling it unanswered. Skip newsletters, receipts, renewal reminders, and automated notices unless they report a concrete security event. Always omit one-time passwords, verification codes, magic links, sign-in links, and account-registration messages.

For messaging, gather direct questions, requests, mentions, and DMs you have not answered; significant work issues and personal updates; and messages you sent during the accomplishment window that show a completed action or decision. A reaction without a written reply leaves a direct question unanswered, but can resolve a simple FYI. Keep the visible person or conversation name, timestamp, status, and HTTPS permalink or conversation URL when available. Use the identity mappings in the repository instructions. Never infer a name from a handle.

Also gather your five latest substantive Slack posts in `#standup` only as style examples for the final proposed standup. Do not treat their old content as current work.
