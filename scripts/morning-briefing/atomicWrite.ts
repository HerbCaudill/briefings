import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { dirname } from "node:path"
import { randomUUID } from "node:crypto"

/** Write a UTF-8 file through a durable temporary file, atomic rename and directory flush. */
export function writeTextAtomically(
  /** Destination file path. */
  path: string,
  /** Complete file contents. */
  contents: string,
): void {
  mkdirSync(dirname(path), { mode: 0o700, recursive: true })
  const temporaryPath = `${path}.${randomUUID()}.tmp`
  const mode = existsSync(path) ? statSync(path).mode & 0o777 : 0o600
  const file = openSync(temporaryPath, "wx", mode)
  try {
    writeFileSync(file, contents, "utf8")
    fsyncSync(file)
  } finally {
    closeSync(file)
  }
  renameSync(temporaryPath, path)
  const directory = openSync(dirname(path), "r")
  try {
    fsyncSync(directory)
  } finally {
    closeSync(directory)
  }
}
