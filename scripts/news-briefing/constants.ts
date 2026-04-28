import type { NewsSourceConfig } from "./types.ts"

export const ARTICLE_FETCH_CONCURRENCY = 4
export const ARTICLE_FETCH_RETRY_LIMIT = 3
export const DEFAULT_MAX_HEADLINES_PER_SOURCE = 30
export const PUBLIC_BRIEFINGS_DIRECTORY_PATH = "public/briefings"
export const RAW_BRIEFINGS_DIRECTORY_PATH = "public/briefings/raw"

export const NEWS_SOURCE_CONFIGS: NewsSourceConfig[] = [
  { homepageUrl: "https://www.bbc.com/news", key: "bbc", name: "BBC News", region: "world" },
  {
    homepageUrl: "https://www.theguardian.com/world",
    key: "guardian",
    name: "The Guardian",
    region: "world",
  },
  {
    homepageUrl: "https://www.reuters.com/world/",
    key: "reuters-world",
    name: "Reuters",
    region: "world",
  },
  {
    homepageUrl: "https://www.aljazeera.com/",
    key: "al-jazeera",
    name: "Al Jazeera",
    region: "world",
  },
  {
    homepageUrl: "https://www.france24.com/en/",
    key: "france24",
    name: "France 24",
    region: "world",
  },
  {
    homepageUrl: "https://www.nytimes.com/section/us",
    key: "nyt-us",
    name: "The New York Times",
    region: "us",
  },
  {
    homepageUrl: "https://www.washingtonpost.com/national/",
    key: "washington-post-national",
    name: "The Washington Post",
    region: "us",
  },
  {
    homepageUrl: "https://apnews.com/us-news",
    key: "ap-us",
    name: "Associated Press",
    region: "us",
  },
  { homepageUrl: "https://www.politico.com/", key: "politico", name: "Politico", region: "us" },
  {
    homepageUrl: "https://elpais.com/espana/",
    key: "elpais-espana",
    name: "El País",
    region: "spain",
  },
  {
    homepageUrl: "https://www.elmundo.es/espana.html",
    key: "elmundo-espana",
    name: "El Mundo",
    region: "spain",
  },
  {
    homepageUrl: "https://www.rtve.es/noticias/espana/",
    key: "rtve-espana",
    name: "RTVE",
    region: "spain",
  },
  {
    homepageUrl: "https://www.lavanguardia.com/",
    key: "lavanguardia",
    name: "La Vanguardia",
    region: "spain",
  },
  {
    homepageUrl: "https://www.elperiodico.com/es/",
    key: "elperiodico-espana",
    name: "El Periódico",
    region: "spain",
  },
  {
    homepageUrl: "https://www.3cat.cat/3catinfo/",
    key: "3cat-info",
    name: "3Cat",
    region: "barcelona",
  },
  { homepageUrl: "https://beteve.cat/", key: "beteve", name: "betevé", region: "barcelona" },
  {
    homepageUrl: "https://www.3cat.cat/3catinfo/barcelona-ciutat/",
    key: "3cat-barcelona",
    name: "3Cat Barcelona",
    region: "barcelona",
  },
  {
    homepageUrl: "https://www.totbarcelona.cat/",
    key: "tot-barcelona",
    name: "Tot Barcelona",
    region: "barcelona",
  },
  {
    homepageUrl: "https://www.elperiodico.com/es/barcelona/",
    key: "elperiodico-barcelona",
    name: "El Periódico Barcelona",
    region: "barcelona",
  },
  {
    homepageUrl: "https://www.diaridegirona.cat/baix-emporda/",
    key: "diari-girona-baix-emporda",
    name: "Diari de Girona",
    region: "extras",
  },
  {
    homepageUrl: "https://www.emporda.info/tags/palafrugell/",
    key: "emporda-palafrugell",
    name: "Empordà",
    region: "extras",
  },
  {
    homepageUrl: "https://www.thenewbarcelonapost.cat/",
    key: "barcelona-post",
    name: "The New Barcelona Post",
    region: "extras",
  },
  {
    homepageUrl: "https://www.diaridebarcelona.cat/",
    key: "diari-barcelona",
    name: "Diari de Barcelona",
    region: "extras",
  },
]

export const SYNTHESIS_PROMPT = [
  "Use the raw briefing file to select and summarize the strongest stories.",
  "Return only a JSON object with a top-level sections array.",
  "Section titles must be exactly: World, US, Spain, Barcelona & Catalunya.",
  "Each story must include headline, body, and sources.",
  "Each body must be one paragraph of plain text with no markdown.",
  "Use the extracted article bodies in the raw briefing file rather than headline text alone.",
  "Exclude sports.",
].join("\n")
