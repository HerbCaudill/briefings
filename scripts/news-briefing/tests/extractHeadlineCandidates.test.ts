import { describe, expect, test } from "vitest"
import { extractHeadlineCandidates } from "../extractHeadlineCandidates.ts"

describe("extractHeadlineCandidates", () => {
  test("extracts heading links from nested anchors, parent anchors, and aria-label stretched links", () => {
    const candidates = extractHeadlineCandidates(
      "https://example.com/world/",
      `
        <html>
          <body>
            <h2><a href="/story-1">Inside anchor headline with enough words to be kept</a></h2>
            <a href="/story-2"><h3>Parent anchor headline with enough words to be kept</h3></a>
            <a href="/story-3" aria-label="Stretched link headline with enough words to be kept"></a>
            <h3>Stretched link headline with enough words to be kept</h3>
            <h2><a href="/news/washington-politics">WASHINGTON &amp; POLITICS</a></h2>
            <h2>Too short</h2>
            <h2><a href="/story-1">Inside anchor headline with enough words to be kept</a></h2>
          </body>
        </html>
      `,
    )

    expect(candidates).toEqual([
      {
        headline: "Inside anchor headline with enough words to be kept",
        position: 1,
        url: "https://example.com/story-1",
      },
      {
        headline: "Parent anchor headline with enough words to be kept",
        position: 2,
        url: "https://example.com/story-2",
      },
      {
        headline: "Stretched link headline with enough words to be kept",
        position: 3,
        url: "https://example.com/story-3",
      },
    ])
  })

  test("extracts article-like anchor text when source pages do not use heading tags", () => {
    const candidates = extractHeadlineCandidates(
      "https://example.com/",
      `
        <a href="/login">has oblidat la contrasenya?</a>
        <h3><a href="/latest-news">Últimes notícies</a></h3>
        <h2><a href="/societat/envia-carta">Envia una carta del lector</a></h2>
        <h3>Segueix-nos a les xarxes socials:</h3>
        <a class="post-card" href="/economia/story-one">Barcelona Oberta vol que la Rambla sigui un nou eix comercial &#8217;especial&#8217;</a>
        <a href="/economia/story-one">Barcelona Oberta vol que la Rambla sigui un nou eix comercial &#8217;especial&#8217;</a>
        <a href="/category/economia">Economia</a>
      `,
    )

    expect(candidates).toEqual([
      {
        headline: "Barcelona Oberta vol que la Rambla sigui un nou eix comercial ’especial’",
        position: 1,
        url: "https://example.com/economia/story-one",
      },
    ])
  })

  test("extracts RSS item titles and links", () => {
    const candidates = extractHeadlineCandidates(
      "https://example.com/rss.xml",
      `
        <rss>
          <channel>
            <item>
              <title>France 24 story headline with enough words to keep</title>
              <link>https://example.com/en/france-24-story</link>
            </item>
            <item>
              <title><![CDATA[Politico story headline with enough words to keep]]></title>
              <link>https://example.com/news/politico-story</link>
            </item>
          </channel>
        </rss>
      `,
    )

    expect(candidates).toEqual([
      {
        headline: "France 24 story headline with enough words to keep",
        position: 1,
        url: "https://example.com/en/france-24-story",
      },
      {
        headline: "Politico story headline with enough words to keep",
        position: 2,
        url: "https://example.com/news/politico-story",
      },
    ])
  })

  test("drops stale RSS items and records publication dates on fresh ones", () => {
    const candidates = extractHeadlineCandidates(
      "https://example.com/rss.xml",
      `
        <rss>
          <channel>
            <item>
              <title>Fresh story headline with enough words to keep</title>
              <link>https://example.com/world/fresh-story</link>
              <pubDate>Sat, 11 Jul 2026 09:43:26 GMT</pubDate>
            </item>
            <item>
              <title>Stale story headline with enough words to keep</title>
              <link>https://example.com/world/stale-story</link>
              <pubDate>Thu, 04 Jun 2026 14:40:48 GMT</pubDate>
            </item>
            <item>
              <title>Undated story headline with enough words to keep</title>
              <link>https://example.com/world/undated-story</link>
            </item>
          </channel>
        </rss>
      `,
      { briefingDate: "2026-07-12" },
    )

    expect(candidates).toEqual([
      {
        date: "2026-07-11",
        headline: "Fresh story headline with enough words to keep",
        position: 1,
        url: "https://example.com/world/fresh-story",
      },
      {
        headline: "Undated story headline with enough words to keep",
        position: 2,
        url: "https://example.com/world/undated-story",
      },
    ])
  })

  test("keeps dated RSS items when no briefing date is provided", () => {
    const candidates = extractHeadlineCandidates(
      "https://example.com/rss.xml",
      `
        <rss>
          <channel>
            <item>
              <title>Old story headline with enough words to keep</title>
              <link>https://example.com/world/old-story</link>
              <pubDate>Thu, 04 Jun 2026 14:40:48 GMT</pubDate>
            </item>
          </channel>
        </rss>
      `,
    )

    expect(candidates).toEqual([
      {
        date: "2026-06-04",
        headline: "Old story headline with enough words to keep",
        position: 1,
        url: "https://example.com/world/old-story",
      },
    ])
  })

  test("ignores headline links that are not HTTP article URLs", () => {
    const candidates = extractHeadlineCandidates(
      "https://example.com/",
      `
        <h2><a href="javascript:void(0)">Javascript headline with enough words to otherwise keep</a></h2>
        <h2><a href="mailto:newsroom@example.com">Email headline with enough words to otherwise keep</a></h2>
        <h2><a href="#main-content">Hash headline with enough words to otherwise keep</a></h2>
        <h2><a href="/world/story-one">Actual article headline with enough words to keep</a></h2>
      `,
    )

    expect(candidates).toEqual([
      {
        headline: "Actual article headline with enough words to keep",
        position: 1,
        url: "https://example.com/world/story-one",
      },
    ])
  })

  test("ignores malformed HTTP links without aborting extraction", () => {
    const candidates = extractHeadlineCandidates(
      "https://beteve.cat/feed/",
      `
        <a href="http://Les%20Roquetes%20recordar%C3%A0%20amb%20una%20pla%C3%A7a%20Maria%20Ant%C3%B2nia%20Canals,%20la%20mestra%20que%20ho%20va%20canviar%20tot">
          Les Roquetes recordarà amb una plaça Maria Antònia Canals, la mestra que ho va canviar tot
        </a>
        <a href="https://beteve.cat/societat/valid-story/">
          Barcelona manté oberta una notícia prou llarga per continuar després de l'enllaç malformat
        </a>
      `,
    )

    expect(candidates).toEqual([
      {
        headline:
          "Barcelona manté oberta una notícia prou llarga per continuar després de l'enllaç malformat",
        position: 1,
        url: "https://beteve.cat/societat/valid-story/",
      },
    ])
  })
})
