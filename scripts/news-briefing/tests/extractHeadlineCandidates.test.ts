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
})
