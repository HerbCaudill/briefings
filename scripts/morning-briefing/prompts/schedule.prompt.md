# Schedule and tasks lane

Lane key: `schedule`

Assigned sources, in this exact spelling and order:

1. `Primary calendar`
2. `Lynne's calendar`
3. `DevResults calendar`
4. `Family and Tamariu calendars`
5. `Tasks`

Use the connected Google Calendar tools for calendars. Inspect the accessible calendar list and match non-primary calendar names case-insensitively. The household calendars are named exactly `Family` and `Tamariu House`; query both separately. Do not substitute a similarly named calendar.

Run `pnpm --silent briefing:location` to read the latest Backtrack location. It returns `barcelona`, `tamariu`, or `other` by comparing the latest coordinates with two approximate bounding boxes. Include the returned place label in your report so synthesis can filter location-specific tasks, and use it as last-known place context when interpreting relevant calendar and household plans. `other` identifies no particular destination. If the script fails, omit location context and continue gathering. Keep the run's date and time zone unchanged.

For the primary calendar, read today's events. Record start time in the local time zone stated in the run context, duration, title, event URL, response status, useful event context, declines, pending invitations, and meaningful free stretches.

For Lynne's calendar, read today's timed events and report aggregate workload only: occupied therapy hours, occupied hours for other meetings or appointments, the end time of her last busy event, and any overlap between categories. Classify therapy only when the title or existing calendar label supports it. Exclude declined, cancelled, all-day, and free events. Never expose client names or individual therapy titles.

For DevResults, read events that overlap today. Record only explicit out-of-office events, the person, the event link, and whether the absence is all day or partial with hours. Include multi-day events spanning today. Do not infer absence from ordinary meetings or ambiguous titles.

For `Family` and `Tamariu House`, read today through the next 14 calendar days. Record noteworthy visitors, stays, trips, arrivals, departures, and household plans. Skip birthdays, routine appointments, and vague placeholders unless they affect preparation or availability. Omit unchanged plans already covered recently until they are within seven days, unless details changed. Mark this source incomplete if either exact calendar cannot be queried, and name the missing calendar in the reason.

Read the Tasks skill. Use the managed `tasks` CLI with `--freshness converged --timezone Europe/Madrid`, checking the serving space against `TASKS_SPACE_ID` (or the skill’s enrolled space for manual runs). Enumerate every continuation page of `tasks list` for both `kind: "task"` and `kind: "project"`. Retain all unfinished tasks and projects and tasks completed during the last seven local dates, including today. Include IDs, canonical URLs, titles, descriptions, status, completion time, project context, snooze dates and provenance. Completed tasks have `status: "done"`; do not mistake retained completed rows for unfinished work.

Mark Tasks incomplete if the service is unavailable, pagination conflicts, the space mismatches or convergence cannot be established. Never substitute stale data or Google Tasks. Missing or deleted tasks are not evidence of completion.
