# Briefings on the mini

The Windows port uses mise's Node 24 installation and the managed Tasks peer. `CODEX_COMMAND_PATH` can override the Codex executable; the Windows default is the mise `codex.exe` shim. Pi runs through the global Node package with provider `openai`; `PI_PROVIDER` overrides that provider when needed. Managed Tasks and delegated Google commands run their Node entrypoints directly so Windows command-shell quoting cannot alter JSON or prompts.

Run dotfiles' `scripts/windows/install-briefing-desktop.ps1` elevated to install the interactive `T3 desktop`, `Obsidian desktop` and `Signal desktop` launchers and protect local state directories. This does not schedule a briefing or Inbox writer. The apps need Herb's signed-in Windows desktop. Obsidian's official console entrypoint is `%LOCALAPPDATA%\Programs\Obsidian\Obsidian.com`; enable its CLI and connect the existing `notes` remote Sync vault before unattended runs. Windows `gh-sync` excludes notes, so Obsidian Sync is the mini's only vault sync method.

Signal uses sigtop's native Windows key-store support. Link this Signal Desktop as a new device; do not copy the Mac database or encryption keys. WhatsApp, Messenger, LinkedIn and other browser sources need their own sign-ins in Agent Chrome. The work lane reads the shared agent transcript archive with `--machine all`.

Set `BACKTRACK_CSV_PATH` if a Windows-accessible CSV is available. Otherwise the Windows location command reports `unknown`, and the schedule lane omits location filtering. Scans use an existing Drive mount or the file-scans skill's delegated Drive API fallback.

The Mac-only source entrypoint is `scripts/mac-sources/run.ts`. It exports recent Apple Messages to a private artifact, copies that artifact to the mini, and independently imports undated Apple Reminders into the Mac's existing managed Tasks peer. `--export-only` omits Reminder writes for transfer verification. The mini reads the last artifact at `~/.local/state/morning-briefing/mac-sources/apple-messages.json`; exports older than two hours retain their conversations with status `stale`. A sleeping Mac therefore leaves stale evidence rather than erasing it. The hourly Mac job must be switched to this entrypoint before enabling the mini's Inbox writer; do not operate both capture/research writers.

Windows capture and description journals use hashed filenames because logical request IDs contain colons. The JSON retains the original request IDs and event keys. Existing Mac journal names remain unchanged. Artifact publication flushes the file before atomic rename; Node does not support the extra directory flush on Windows.

The mini's hourly `Inbox intake` job is enabled. `Inbox research` runs independently on demand, without a time limit. The Mac's hourly `process-inbox` now runs only the deterministic Reminders and Messages source entrypoint through its existing Full Disk Access launcher. Its capture and research journals were preserved on the mini before intake was enabled.

The mini's interactive `Morning briefing` task runs daily at 07:00. Its acceptance run covered all 16 sources, saved both proposed tasks, published the exact final briefing to the daily note, completed Obsidian Sync, and successfully triggered the mini T3 presentation. The Mac morning LaunchAgent is unloaded and disabled; its source-only hourly job remains active. Do not enable both morning jobs.

The managed Tasks peer runs in Herb's automatically signed-in desktop session; S4U and SSH clients use its authenticated loopback transport. The Windows CLI uses a revision-bound, hash-checked bundle outside the immutable selected release, avoiding elevated SSH failures on pnpm junctions.
