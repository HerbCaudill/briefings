import { execFile } from "node:child_process"
import { promisify } from "node:util"

/** Open the app in the signed-in desktop through its installed interactive task. */
export async function openWindowsDesktopApp(
  /** Registered interactive desktop task. */
  task: "Obsidian desktop" | "T3 desktop",
) {
  await promisify(execFile)("schtasks.exe", ["/Run", "/TN", task], { windowsHide: true })
}
