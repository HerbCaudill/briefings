# Scanned documents lane

Lane key: `documents`

Assigned sources, in this exact spelling and order:

1. `Scanned documents`

Unlike the other lanes, this lane has one assigned write action: file new scans. Use the `file-scans` skill and follow its "Unattended runs" section. Apply the full filing plan without asking for approval. Do not take any other action.

If both inboxes are empty, the source is `covered` and the report is empty.

In the report, list two things:

- **Needs attention:** each filed document that needs Herb, with its new path as an absolute local file link, what it asks for, and any deadline or amount. Include documents filed with low confidence and anything left in an inbox, with the reason.
- **Filed:** one compact line per document with its new path, plus merges, splits, and deleted duplicates.

Mark the source `incomplete` only when filing could not run at all, for example when the scans folder or the filing script is unavailable after the Drive fallbacks in the skill.
