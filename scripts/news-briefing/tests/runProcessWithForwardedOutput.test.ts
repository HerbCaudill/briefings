import { EventEmitter } from "node:events"
import { PassThrough, Writable } from "node:stream"
import { describe, expect, test } from "vitest"
import { runProcessWithForwardedOutput } from "../runProcessWithForwardedOutput.ts"

describe("runProcessWithForwardedOutput", () => {
  test("forwards stdout and stderr while returning captured stdout", async () => {
    const childProcess = new EventEmitter() as ChildProcessStub
    childProcess.stdout = new PassThrough()
    childProcess.stderr = new PassThrough()

    const stdoutChunks: string[] = []
    const stderrChunks: string[] = []

    const resultPromise = runProcessWithForwardedOutput("pi", ["-p", "hello"], {
      spawnProcess: (() => childProcess) as SpawnProcessStub,
      stderr: createStringWriter(stderrChunks),
      stdout: createStringWriter(stdoutChunks),
    })

    childProcess.stdout.write("partial ")
    childProcess.stderr.write("thinking\n")
    childProcess.stdout.write("json")
    childProcess.emit("close", 0)

    await expect(resultPromise).resolves.toBe("partial json")
    expect(stdoutChunks.join("")).toBe("partial json")
    expect(stderrChunks.join("")).toBe("thinking\n")
  })
})

/** Create a writable stream that appends chunks to an array. */
function createStringWriter(
  /** The destination array for string chunks. */
  chunks: string[],
): Writable {
  return new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk.toString("utf8"))
      callback()
    },
  })
}

type ChildProcessStub = EventEmitter & {
  /** The stubbed child stderr stream. */
  stderr: PassThrough
  /** The stubbed child stdout stream. */
  stdout: PassThrough
}

type SpawnProcessStub = () => ChildProcessStub
