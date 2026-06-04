Use the selected hydrated stories to write the final briefing JSON. Each story body must be one paragraph of plain text with no markdown. Use the extracted article bodies in the hydrated selection rather than headline text alone.

Return only valid JSON matching this TypeScript type:

```ts
type Briefing = {
  sections: Array<{
    title: "World" | "US" | "Spain" | "Barcelona & Catalunya"
    stories: Array<{
      headline: string
      body: string
      sources: Array<{
        name: string
        url: string
      }>
    }>
  }>
}
```
