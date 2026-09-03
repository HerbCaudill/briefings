# Schedule and tasks lane

Lane key: `schedule`

Assigned sources, in this exact spelling and order:

1. `Primary calendar`
2. `Lynne's calendar`
3. `DevResults calendar`
4. `Family and Tamariu calendars`
5. `Google Tasks`

Use the connected Google Calendar tools for calendars. Inspect the accessible calendar list and match non-primary calendar names case-insensitively. Do not substitute a similarly named calendar.

For the primary calendar, read today's events. Record start time in the local time zone stated in the run context, duration, title, event URL, response status, useful event context, declines, pending invitations, and meaningful free stretches.

For Lynne's calendar, read today's timed events and report aggregate workload only: occupied therapy hours, occupied hours for other meetings or appointments, the end time of her last busy event, and any overlap between categories. Classify therapy only when the title or existing calendar label supports it. Exclude declined, cancelled, all-day, and free events. Never expose client names or individual therapy titles.

For DevResults, read events that overlap today. Record only explicit out-of-office events, the person, the event link, and whether the absence is all day or partial with hours. Include multi-day events spanning today. Do not infer absence from ordinary meetings or ambiguous titles.

For Family and Tamariu, read today through the next 14 calendar days. Record noteworthy visitors, stays, trips, arrivals, departures, and household plans. Skip birthdays, routine appointments, and vague placeholders unless they affect preparation or availability. Omit unchanged plans already covered recently until they are within seven days, unless details changed.

Use `gws-delegated` for Google Tasks. Find the `Today` list with `gws-delegated tasks tasklists list`, then list its incomplete tasks with `gws-delegated tasks tasks list --params '{"tasklist":"<id>","showCompleted":false}'`. Skip migration ghosts with a numeric-style ID containing `:0:`, position `2147483647`, or an updated date more than one year old. Include every current task's title, notes, links, parent, and subtasks so synthesis can avoid duplicating actions already captured.
