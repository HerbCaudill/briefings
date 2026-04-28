export type NewsRegion = "world" | "us" | "spain" | "barcelona" | "extras"

export type NewsSourceConfig = {
  homepageUrl: string
  key: string
  name: string
  region: NewsRegion
}

export type HeadlineCandidate = {
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
  createdAt: string
  date: string
}

export type BuildRawBriefingArgs = {
  date: string
  fetchPageHtml: (url: string) => Promise<string>
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
  rawDirectoryPath: string
  runPi: (args: RunPiArgs) => Promise<string>
}

export type RunNewsBriefingPipelineArgs = {
  date: string
  listMissingBriefingDates: () => string[]
  runFetchStage: (date: string) => Promise<RawBriefing>
  runSynthesisStage: (date: string) => Promise<string>
}
