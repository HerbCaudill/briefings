import { expect, test } from "vitest"
import { getPiInvocation } from "../getPiInvocation.ts"

test("runs the installed Windows Pi entrypoint through Node with literal prompt arguments", () => {
  const invocation = getPiInvocation(
    ["@C:/raw/news.json", "Select A & B"],
    "win32",
    "C:/node/node.exe",
  )
  expect(invocation.command).toBe("C:/node/node.exe")
  expect(invocation.args[0].replaceAll("\\", "/")).toBe(
    "C:/node/node_modules/@earendil-works/pi-coding-agent/dist/bundle/cli.js",
  )
  expect(invocation.args.slice(-2)).toEqual(["@C:/raw/news.json", "Select A & B"])
})
