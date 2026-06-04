export type NewsRegion = "world" | "us" | "spain" | "barcelona" | "extras"

export type NewsSourceConfig = {
  fallbackUrls?: string[]
  homepageUrl: string
  key: string
  name: string
  preferFallbackUrls?: boolean
  region: NewsRegion
}

export type HeadlineCandidate = {
  body?: string
  headline: string
  position: number
  url: string
}

export type RawBriefingSighting = {
  headline: string
  listingPageUrl: string
  position: number
  source: RawBriefingSource
}

export type RawBriefingSource = {
  homepageUrl: string
  key: string
  name: string
  region: NewsRegion
}

export type RawBriefingArticle = {
  body: string
  firstSeenPosition: number
  headline: string
  listingPageUrl: string
  sightings: RawBriefingSighting[]
  source: RawBriefingSource
  url: string
}

export type RawBriefing = {
  articles: RawBriefingArticle[]
  createdAt?: string
  date: string
}

export type BriefingSelectionInputArticle = {
  firstSeenPosition: number
  headline: string
  source: string
  region: NewsRegion
  url: string
}

export type BriefingSelectionInput = {
  articles: BriefingSelectionInputArticle[]
  date: string
}

export type BriefingSelectedStory = {
  headline: string
  section: string
  sourceUrls: string[]
}

export type BriefingSelection = {
  stories: BriefingSelectedStory[]
}

export type HydratedBriefingSource = {
  body: string
  headline: string
  source: string
  url: string
}

export type HydratedBriefingStory = {
  headline: string
  section: string
  sources: HydratedBriefingSource[]
}

export type HydratedBriefingSelection = {
  date: string
  stories: HydratedBriefingStory[]
}

export type BuildRawBriefingArgs = {
  date: string
  fetchPageHtml: (url: string) => Promise<string>
  log?: (message: string) => void
  maxHeadlinesPerSource?: number
  rawDirectoryPath: string
  sourceConfigs: NewsSourceConfig[]
}

export type ListMissingBriefingDatesArgs = {
  briefingDirectoryPath: string
  rawDirectoryPath: string
}

export type RunPiArgs = {
  prompt: string
  rawBriefingPath: string
}

export type SynthesizeBriefingArgs = {
  briefingDirectoryPath: string
  date: string
  fetchPageHtml: (url: string) => Promise<string>
  rawDirectoryPath: string
  runPi: (args: RunPiArgs) => Promise<string>
}

export type RunNewsBriefingPipelineArgs = {
  date: string
  listMissingBriefingDates: () => string[]
  log?: (message: string) => void
  runFetchStage: (date: string) => Promise<RawBriefing>
  runSynthesisStage: (date: string) => Promise<string>
}
