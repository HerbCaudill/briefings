import { createServer, type Server } from "node:http"
import { afterEach, describe, expect, test } from "vitest"
import { fetchPageHtmlWithCurl } from "../fetchPageHtmlWithCurl.ts"

const servers: Server[] = []
afterEach(async () => {
  for (const server of servers.splice(0))
    await new Promise<void>((resolve, reject) =>
      server.close(error => (error ? reject(error) : resolve())),
    )
})

describe("fetchPageHtmlWithCurl", () => {
  test("returns pages larger than Node's default exec buffer", async () => {
    const url = await serve(200, "x".repeat(1_200_000))
    await expect(fetchPageHtmlWithCurl(url)).resolves.toHaveLength(1_200_000)
  })
  test("rejects HTTP error responses", async () => {
    const url = await serve(403, "Forbidden")
    await expect(fetchPageHtmlWithCurl(url)).rejects.toThrow()
  })
})

/** Serve a real local response so the curl contract is checked on every host OS. */
async function serve(
  /** HTTP response status. */
  status: number,
  /** Body returned by the fixture server. */
  body: string,
) {
  const server = createServer((_request, response) => {
    response.writeHead(status)
    response.end(body)
  })
  servers.push(server)
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string") throw new Error("Fixture server did not bind")
  return `http://127.0.0.1:${address.port}`
}
