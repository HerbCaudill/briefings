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

export type BriefingCandidateArticle = {
  firstSeenPosition: number
  headline: string
  source: string
  region: NewsRegion
  url: string
}

export type BriefingCandidates = {
  articles: BriefingCandidateArticle[]
  date: string
}

export type RawBriefingArticle = BriefingCandidateArticle & {
  body?: string
}

export type RawBriefing = BriefingCandidates

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

export type ClearExistingBriefingFilesArgs = {
  briefingDirectoryPath: string
  date: string
  rawDirectoryPath: string
}

export type RunNewsBriefingPipelineArgs = {
  clearExistingBriefingFiles: (date: string) => Promise<void>
  date: string
  listMissingBriefingDates: () => string[]
  log?: (message: string) => void
  runFetchStage: (date: string) => Promise<RawBriefing>
  runSynthesisStage: (date: string) => Promise<string>
}
