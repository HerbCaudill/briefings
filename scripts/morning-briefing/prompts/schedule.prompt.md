# Schedule and tasks lane

Lane key: `schedule`

Assigned sources, in this exact spelling and order:

1. `Primary calendar`
2. `Lynne's calendar`
3. `DevResults calendar`
4. `Family and Tamariu calendars`
5. `Google Tasks`

Use the connected Google Calendar tools for calendars. Inspect the accessible calendar list and match non-primary calendar names case-insensitively. The household calendars are named exactly `Family` and `Tamariu House`; query both separately. Do not substitute a similarly named calendar.

For the primary calendar, read today's events. Record start time in the local time zone stated in the run context, duration, title, event URL, response status, useful event context, declines, pending invitations, and meaningful free stretches.

For Lynne's calendar, read today's timed events and report aggregate workload only: occupied therapy hours, occupied hours for other meetings or appointments, the end time of her last busy event, and any overlap between categories. Classify therapy only when the title or existing calendar label supports it. Exclude declined, cancelled, all-day, and free events. Never expose client names or individual therapy titles.

For DevResults, read events that overlap today. Record only explicit out-of-office events, the person, the event link, and whether the absence is all day or partial with hours. Include multi-day events spanning today. Do not infer absence from ordinary meetings or ambiguous titles.

For `Family` and `Tamariu House`, read today through the next 14 calendar days. Record noteworthy visitors, stays, trips, arrivals, departures, and household plans. Skip birthdays, routine appointments, and vague placeholders unless they affect preparation or availability. Omit unchanged plans already covered recently until they are within seven days, unless details changed. Mark this source incomplete if either exact calendar cannot be queried, and name the missing calendar in the reason.

Use `gws-delegated` for Google Tasks. List every task list with `gws-delegated tasks tasklists list`, then make both of these queries for every list:

1. List its incomplete tasks with `gws-delegated tasks tasks list --params '{"tasklist":"<id>","showCompleted":false}'`.
2. List tasks completed during the last seven local dates, including today, with `gws-delegated tasks tasks list --params '{"tasklist":"<id>","showCompleted":true,"showHidden":true,"completedMin":"<RFC3339 start of the seven-day window>"}'`.

Skip migration ghosts with a numeric-style ID containing `:0:`, position `2147483647`, or an updated date more than one year old. Group results by list, then separate incomplete and recently completed tasks. Include each task's status, completion time when present, title, notes, links, parent, and subtasks. The synthesis agent needs all incomplete tasks to avoid duplicating actions, and recently completed tasks to recognize resolved carryover and completed work.
