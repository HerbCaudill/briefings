import { existsSync, mkdirSync, renameSync, statSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { randomUUID } from "node:crypto"

/** Write a UTF-8 file through a same-directory temporary file and atomic rename. */
export function writeTextAtomically(
  /** Destination file path. */
  path: string,
  /** Complete file contents. */
  contents: string,
): void {
  mkdirSync(dirname(path), { mode: 0o700, recursive: true })
  const temporaryPath = `${path}.${randomUUID()}.tmp`
  const mode = existsSync(path) ? statSync(path).mode & 0o777 : 0o600
  writeFileSync(temporaryPath, contents, { encoding: "utf8", mode })
  renameSync(temporaryPath, path)
}
