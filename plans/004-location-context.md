# Backtrack location context for morning briefings

## Goal

Give the morning briefing a simple last-known place: `barcelona`, `tamariu`, or `other`.

## Approach

Read Backtrack's iCloud file at `~/Library/Mobile Documents/iCloud~com~adamlechowicz~Backtrack/Documents/backtrack.csv`. Its columns are `DateTime,Latitude,Longitude,Device`. Take the final nonblank row and compare its coordinates with two approximate bounding boxes:

| Place     | Latitude    | Longitude |
| --------- | ----------- | --------- |
| Barcelona | 41.32–41.48 | 2.05–2.23 |
| Tamariu   | 41.90–41.93 | 3.19–3.23 |

Return `other` when the coordinates are outside both boxes. Missing or invalid coordinates fail the command rather than claiming a different place. Ignore timestamp and device fields. Do not add freshness rules, time-zone parsing, configuration files, geocoding, or another gather lane.

The schedule agent calls `pnpm --silent briefing:location` and uses the result as last-known context for relevant calendar and household plans. If the command fails, gathering continues without location context. The result does not change the run's date or time zone.

## Implementation

The classifier is in `scripts/morning-briefing/getCurrentLocation.ts`; the small CLI is in `scripts/morning-briefing/location.ts`. An optional file-path argument supports reading another Backtrack CSV. Focused tests cover both boxes, elsewhere, inclusive boundaries, final-row selection, and invalid coordinates. The script was also checked against the local iCloud file.

Herb authorized agent access to the location data. Routine output contains only the place label.

## Unresolved questions

None. The box edges are approximate and can be adjusted directly in the classifier if needed.
