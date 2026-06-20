Select the strongest stories for today's briefing from this list of headlines. Aim for 14 to 18 stories total, with meaningful coverage across all four sections when the candidate list supports it. Prefer stories that are important, timely, and have multiple useful sources. Exclude sports, celebrity news, and thin evergreen features. Write all output in English, translating non-English headlines when needed.

If a list of stories already covered in yesterday's briefing is provided below, avoid repeating them. Do not select a story that merely restates one of yesterday's stories; only revisit a topic when there is a significant new development, and choose a candidate whose headline reflects what is new.

Return only valid JSON matching this TypeScript type:

```ts
type BriefingSelection = {
  stories: Array<{
    headline: string
    section: "World" | "US" | "Spain" | "Barcelona & Catalunya"
    sourceUrls: string[]
  }>
}
```
