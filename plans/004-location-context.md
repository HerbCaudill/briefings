# Backtrack location context for morning briefings

## Goal

Give the morning briefing useful recent place context with dependable parsing, honest freshness labels, and graceful failure behavior.

## Findings

The local source is `~/Library/Mobile Documents/iCloud~com~adamlechowicz~Backtrack/Documents/backtrack.csv`. On October 6, 2026, it was a readable 420,626-byte UTF-8 file with the header `DateTime,Latitude,Longitude,Device` and 9,071 records. All inspected records had four fields and valid coordinate ranges. One device identifier appeared. There were 1,647 exact duplicate records; a timestamp alone is not a unique record key. No coordinates or device identifier were copied into this plan.

The timestamp format is `yyyy-MM-dd HH:mm:ss`, without an offset. The latest row said `2026-10-06 08:54:29`; the file modification time was `06:54:29Z`, consistent with Europe/Madrid that morning. The file remained unchanged across repeated reads during the investigation. This establishes local readability and a recent write, not a measured iCloud delivery delay or update guarantee. Nominal wall-clock gaps include periods approaching nine days; logging is not a heartbeat.

Backtrack's public [location writer](https://github.com/adamlechowicz/Backtrack/blob/499d85212d7a7a4391ef32a6091ddbf384f6a6d4/Backtrack/Model/LocationHelper.swift) appends rows to the CSV. It runs both ordinary background location updates and significant-change monitoring, with a default 200-metre distance filter. It rejects reported horizontal accuracy above 300 metres, but stores neither accuracy nor the GPS measurement timestamp. It timestamps the callback with `Date()` in the phone's current time zone. Its duplicate check also compares longitude with the previous latitude, which can explain some duplicates. These are public-source findings; the installed iPhone build and its settings were not inspected.

Consequently, the CSV can support “your phone last reported near this place.” It cannot prove your current position, the age of the underlying GPS fix, or whether an old report means you stayed put, paused tracking, lost connectivity, or stopped receiving updates. More reliable current-position claims would require a separate producer that includes UTC measurement time, accuracy, and device identity.

## Approach

Add a deterministic optional location read during preparation in `liveRuntime.ts`, after inbox processing and before the three gather lanes start. Run it once per briefing. Use the deterministic reader for the normal workflow instead of another model gather lane.

Herb explicitly authorized this agent and other agents to access the location data and stated that he has no privacy concerns about that access. Source inspection for useful investigation is allowed. Coarse briefing inputs and minimal persistence remain sensible defaults because they reduce unnecessary history, simplify the data contract, and make the source easier to interpret; they are not access restrictions or approval requirements.

### Read and validate locally

Keep the source path, selected device identifier, timestamp-zone policy, named areas, and thresholds in a private configuration file under `~/.config/morning-briefing/`. Keep defaults and schema definitions in this repository. Resolve paths from the home directory; allow a source-path override. Disable the feature until the device and timestamp-zone policy are configured. Even with one device today, do not silently adopt a newly appearing device later.

Read only the header and a bounded tail, initially 64 KiB and expanding to at most 1 MiB if needed to find the configured device. Use a short-lived deterministic reader process with a five-second total deadline so an iCloud read cannot hang the coordinator. Compare identity, size, and modification metadata before and after reading, and retry once inside that deadline if the file changes. Do not modify the source or invoke private iCloud commands. A normal file read may cause macOS to hydrate a placeholder; if it cannot finish within the deadline, return unavailable.

Parse the documented fields strictly, including real calendar dates and finite coordinates in range. Backtrack writes device names without CSV escaping, so split the first three separators and preserve the remaining text as the device identifier; reject ambiguous or changed layouts. Collapse exact duplicates for any corroboration checks. Select the last complete appended report for the configured device rather than the lexicographically largest wall-clock timestamp, which can move backward during travel or daylight-saving changes.

Retry an incomplete trailing write once. If it remains incomplete, a previous complete report may be returned only with an explicit partial-read diagnostic and its own age. A malformed latest complete report must not silently promote an older report to fresh. Conflicting reports at the same apparent instant make the place uncertain. Errors must use fixed reason codes, never source rows, coordinates, raw file contents, or device names.

### Derive only coarse place context

For the first version, use locally configured broad areas for Barcelona and Tamariu, with public locality geometry and labels such as “Barcelona area” and “Tamariu area.” Do not use either house's address or infer saved places by clustering location history. Resolve the selected report locally against these areas. Allow a 300-metre uncertainty margin when matching; if that margin crosses an area edge or two areas overlap, return an uncertain place. The margin is a conservative policy informed by public source code, not a recorded accuracy guarantee.

Points outside supported areas remain `unrecognized`; do not guess a city from the nearest settlement or send coordinates to an online geocoder. A later travel extension can use a reviewed local municipality dataset and local [time-zone boundaries](https://github.com/evansiroky/timezone-boundary-builder), with versioned public data and attribution. That project supplies approximate boundaries with IANA zone identifiers. Coordinate-to-zone lookup alone does not prove which zone the phone used to write its timestamp.

For initial supported areas, use an explicitly configured source zone of Europe/Madrid. Interpret local timestamps with IANA daylight-saving rules, reject nonexistent times, and mark repeated-hour times ambiguous rather than picking one offset. Do not pass offset-free strings to `Date.parse`, assume UTC, or infer timestamp age from file modification time. Outside the trusted source-zone policy, return unknown freshness. An automatic-phone-zone policy needs explicit confirmation before geographic zone lookup can be used as its stated assumption.

### Freshness and failure behavior

These are proposed conservative defaults, measured from callback time at the start of the source read. Recheck age before synthesis so a long gather cannot preserve a fresh label indefinitely. Even a fresh report remains a report about the phone, not verified current presence.

| Report age or condition                                                                               | Briefing use                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| At most two hours, recognizable place, trusted timestamp zone                                         | Optional “phone recently reported near …” context, with report time and zone.                                                                          |
| More than two hours, at most twelve hours                                                             | Explicit “last reported …” context only; do not base current-place advice on it. This accommodates overnight gaps without assuming continued presence. |
| More than twelve hours                                                                                | Stale; omit the place and any location-dependent advice.                                                                                               |
| More than five minutes in the future, ambiguous time, conflicting places, or unknown timestamp zone   | Uncertain; omit place-dependent advice. A future timestamp within five minutes has age zero and a clock-skew diagnostic.                               |
| Missing, inaccessible, timed out, empty, malformed, disabled, unrecognized, or selected device absent | Continue the briefing with a compact diagnosed status. Never fall back to an assumed home location.                                                    |

Backfills for a date other than the run's current date must return `not-applicable`; today's phone report must not describe a historical morning. Do not load old coordinates for backfills.

Do not change the briefing date, calendar display zone, Tasks zone, or 07:00 LaunchAgent schedule from location context. Those currently have different time-zone rules, including the Tasks integration's Europe/Madrid contract. Travel-aware scheduling and calendar interpretation need a separate coordinated change.

### Pass the result into the pipeline

Add a typed `LocationContext` with source, status, optional coarse place, normalized callback time, read time, timestamp-zone assumption, and a fixed diagnostic code. Exclude coordinates, device identifier, source path, addresses, trajectories, and previous places from this type. Use explicit statuses for recent, last-reported, stale, uncertain, unavailable, disabled, and not-applicable.

Pass the sanitized context to the schedule gatherer and into `merged.json` for synthesis. The other gather lanes do not need it. Add `Backtrack location` to the schedule source list and synthesis Sources checklist. A usable recent or explicitly last-reported context counts as covered; stale, uncertain, or unavailable counts as incomplete with a compact reason. Disabled and backfill states are explicitly not applicable and must not suggest a source failure.

The deterministic adapter owns this coverage status, overriding any model guess. Because existing coverage supports only covered/incomplete, extend its schema and checklist validation to represent not-applicable truthfully. Keep all other source coverage rules intact. Under Calendar, permit one coarse context line when it helps explain relevant plans; do not create a mandatory location section, a map link, or an automatic task to repair tracking. Treat calendar destinations as plans rather than evidence of presence. Re-read location each run; carryover must never establish current place.

Persist only the sanitized context under the existing private run directory, using `atomicWrite.ts` and its 0600 file permissions. Retain no additional raw source snapshot, raw cache, or rolling place history. In stale and unavailable results, omit place labels. Suppress raw stderr from the reader and limit manifest diagnostics to fixed codes. Keep every personal artifact out of `public/` and Git. Existing private artifacts, daily notes, and Codex messages can retain any coarse labels included in them; this design minimizes that exposure but does not make them ephemeral.

Current gather agents run with `danger-full-access`, and their complete event streams are retained. Agent access to Backtrack is authorized; no extra sandbox or approval flow is needed for this feature. Prompts should consume the prepared context for consistency, while source inspection remains available for diagnosis. Do not copy the full history into a routine briefing or event stream simply because it is accessible.

## Tasks

1. Implement the private configuration schema, bounded deterministic reader, strict timestamp handling, local area matching, and sanitized result type. Use red-green tests with synthetic CSV records for duplicates, mixed devices, partial writes, invalid latest reports, clock skew, daylight-saving ambiguity, area edges, stale data, and unknown zones. Add a subprocess timeout test and assert that results and failures contain no source coordinates or device identifiers.
2. Integrate one optional preparation stage, schedule-only context, merged synthesis context, deterministic coverage, not-applicable coverage support, freshness rechecks, and prompt rules. Test that unavailable location still publishes both destinations, backfills do not use present-day place, and prompts/artifacts contain only sanitized fields. Update `runPaths.ts`, `types.ts`, `schemas.ts`, the JSON schemas, `constants.ts`, gather/synthesis helpers, checklist validation, and affected tests together.
3. Document the setup and limits in README. Extend dry-run to describe enabled state, source path, policy, and intended artifact path without reading coordinates or writing artifacts. Verify the live reader once under the actual LaunchAgent environment with private configuration; confirm supported area classification locally and report only status, coarse label, and age. Check publication behavior with synthetic unavailable input, then run focused tests and the repository's required checks before committing and pushing implementation.

No implementation or Beads issues have been created. This plan is ready for review.

## Unresolved questions

- Does the iPhone use automatic time-zone updates? The initial fixed Europe/Madrid policy works only where that is the phone's actual timestamp zone; travel freshness must remain uncertain until a policy is established.
- Is Barcelona/Tamariu area context sufficient for the first version, or should the same implementation include an offline travel locality dataset? The proposed first version returns unrecognized elsewhere and never assumes home.
