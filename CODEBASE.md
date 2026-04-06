# Backbrain Mission Control — Codebase Guide

A walkthrough of every file we've written, what it does, and how the pieces connect.

---

## Big picture

The app is two processes talking to each other:

```
Claude Code CLI
     │  (hook fires on every event)
     ▼
forward-event.sh          ← shell script in ~/.claude/hooks/
     │  (writes newline-delimited JSON to a Unix socket)
     ▼
Bun daemon  (server/)     ← single long-running process
     │  (HTTP + WebSocket on localhost:4321)
     ▼
React UI  (client/)       ← Vite SPA, connects over WebSocket
```

Everything stays local. No network calls, no external services.

---

## Project layout

```
backbrain-mc/
├── server/
│   ├── cli.ts            ← binary entry point, CLI subcommands
│   ├── index.ts          ← Bun HTTP + WebSocket server
│   ├── hooks-socket.ts   ← Unix socket listener for Claude hooks
│   ├── missions-store.ts ← in-memory state engine
│   ├── backbrain.ts      ← .bb/ reader and indexer
│   ├── git.ts            ← git branch/commit utilities
│   ├── config.ts         ← config loader with env overrides
│   └── types.ts          ← all shared TypeScript types
├── client/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── types.ts      ← mirror of server/types.ts
│   │   ├── index.css
│   │   ├── main.tsx
│   │   ├── hooks/
│   │   │   └── useAppState.ts
│   │   └── components/
│   │       ├── TelemetryStrip.tsx
│   │       ├── MissionList.tsx
│   │       ├── MissionDetail.tsx
│   │       └── Timeline.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── scripts/
│   ├── install-hooks.ts
│   └── sample-hooks/
│       └── forward-event.sh
├── config/
│   ├── server.json
│   └── projects.json
├── package.json
├── tsconfig.json
├── .npmignore
├── SETUP.md
└── CODEBASE.md
```

---

## File-by-file

### `server/cli.ts`

The binary entry point — this is what `bun build --compile` turns into the standalone `dist/backbrain-mc` executable. Handles four subcommands:

- `backbrain-mc` / `backbrain-mc start` — dynamically imports `./index.ts` to start the daemon
- `backbrain-mc install-hooks` — dynamically imports `scripts/install-hooks.ts`
- `--version` / `-v` — prints the version and exits
- `--help` / `-h` — prints usage and exits

Any unrecognised argument prints an error and exits with code 1. Using dynamic `import()` means the daemon and installer only load when actually needed — the CLI itself is lightweight.

---

### `server/types.ts`

The single source of truth for every data shape in the backend. Defines:

- `ClaudeEvent` — a normalized event received from a Claude Code hook. Fields include `type` (SessionStart, PreToolUse, etc.), `sessionId`, `timestamp`, `workingDir`, `branch`, `toolName`, and the raw input/output payloads.
- `BackbrainNote` — a note read from a `.bb/dumps/*.json` file. Has `text`, `tags` (tasks, bugs, ideas, etc.), `branch`, and `createdAt`.
- `GitCommit` — a commit from `git log`: hash, message, author, timestamp.
- `TimelineItem` — a discriminated union of the three above (`kind: "claude" | "note" | "commit"`). This is what the flight recorder timeline renders.
- `Mission` — the core unit of the app. Keyed by `repoPath::branch`. Holds a `status` (active / idle / cooling), a list of `BackbrainNote`s, a `timeline` of `TimelineItem`s, and which `activeSessions` are currently running in it.
- `ActiveSession` — tracks a live Claude session: its current status (thinking / running-tool / waiting-permission / idle) and the last event it fired.
- `AppState` — the full snapshot: all missions + all active sessions. This is what gets sent to a new WebSocket client on connect.
- `WsMessage` — the four message types the server pushes to clients: `state` (full snapshot), `mission-updated`, `session-updated`, `session-removed`.

---

### `server/config.ts`

Reads `config/server.json` and `config/projects.json` at startup, then merges in environment variable overrides (`MC_PORT`, `MC_SOCKET`). Exports a single `config` object used everywhere else.

```
config.port        → HTTP/WebSocket port (default 4321)
config.socketPath  → Unix socket path (default /tmp/backbrain-mc.sock)
config.watchDirs   → optional list of project dirs to scan
```

---

### `server/missions-store.ts`

The in-memory state engine. No database — everything lives in two `Map`s:

- `missions: Map<string, Mission>` — keyed by `repoPath::branch`
- `sessions: Map<string, ActiveSession>` — keyed by `sessionId`

A `Set` of subscriber callbacks handles broadcasting. When anything changes, the store calls `broadcast()` which fans out to all registered listeners (in practice, just the WebSocket broadcaster in `index.ts`).

Three public ingest functions:

- `ingestClaudeEvent(event)` — called when a hook fires. Creates or updates the mission for that repo+branch, updates the session's status, prepends the event to the timeline, and derives mission status from the event type. On `SessionEnd` it removes the session and marks the mission as "cooling".
- `ingestNotes(repoPath, branch, notes)` — called every 30s by the refresh loop. Replaces the mission's notes array, derives a human-readable title from the earliest task/idea note, and merges new notes into the timeline (deduplicating by id).
- `ingestCommits(repoPath, branch, commits)` — same pattern for git commits. Deduplicates by hash.

After every ingest, the timeline is re-sorted newest-first across all three item kinds.

`getState()` returns a snapshot of all missions sorted by `lastActivity` descending.

---

### `server/hooks-socket.ts`

Opens a Unix domain socket at `config.socketPath` using `Bun.listen`. Each connection gets a string buffer for accumulating partial data. Messages are newline-delimited JSON — when a `\n` arrives, the buffer is split and each complete line is parsed.

`parseHookPayload()` normalizes the raw JSON from Claude into a `ClaudeEvent`. It handles both snake_case (`session_id`, `tool_name`) and camelCase field names since Claude's hook format can vary. Missing fields get sensible defaults.

On startup it deletes any stale socket file. On shutdown (`stopHooksSocket`) it stops the listener and cleans up the file again.

---

### `server/backbrain.ts`

Reads Backbrain data from disk. Two exported functions:

- `readBackbrainNotes(projectDir, branch?)` — looks for `.bb/dumps/*.json` inside the given directory. Each JSON file can be a single note object or an array. Normalizes each entry into a `BackbrainNote`. If a `branch` is passed, filters to notes that either have no branch set or match the given branch.
- `discoverBbDirs(rootDir)` — does a shallow two-level walk from a root directory looking for subdirectories that contain a `.bb/` folder. Used when `config.watchDirs` is empty, to auto-discover projects under `$HOME`.

All file reads are wrapped in try/catch — malformed or missing files are silently skipped.

---

### `server/git.ts`

Three thin async wrappers around `git` CLI calls using `Bun.spawn`:

- `getRepoRoot(cwd)` — runs `git rev-parse --show-toplevel` to find the actual repo root (useful when a project dir is a subdirectory of the repo).
- `getCurrentBranch(cwd)` — runs `git rev-parse --abbrev-ref HEAD`.
- `getRecentCommits(cwd, limit=20)` — runs `git log` with a custom format using `\x1f` as a field separator to get hash, subject, author email, and unix timestamp. Returns an array of `GitCommit`.

All three return `null` / `[]` on failure so they're safe to call on non-git directories.

---

### `server/index.ts`

The daemon core. Wires everything together:

1. Subscribes to the missions store and fans out every `WsMessage` to all connected WebSocket clients.
2. Runs `refreshAll()` on startup and every 30 seconds. For each watched directory it: resolves the repo root, gets the current branch, reads Backbrain notes, reads recent commits, and ingests both into the store.
3. Starts `Bun.serve` on `config.port` handling:
   - WebSocket upgrades — on `open`, sends the full state snapshot; on `close`, removes the client.
   - `GET /api/state` — returns the current state as JSON (useful for debugging).
   - Static file serving — checks for `dist/client/` first (compiled binary layout), then falls back to `../client/dist/` (dev source layout).
   - A fallback HTML page if no build is present (tells you to run `dev:client`).
4. Calls `startHooksSocket()` to open the Unix socket.
5. Handles `SIGINT` to cleanly stop the socket and HTTP server.

---

### `scripts/install-hooks.ts`

A one-shot Bun script that wires Mission Control into Claude Code's hook system. Called via `backbrain-mc install-hooks` or `bun run install-hooks`:

1. Creates `~/.claude/hooks/backbrain-mc/` if it doesn't exist.
2. Copies `scripts/sample-hooks/forward-event.sh` there and `chmod +x`s it.
3. Reads `~/.claude/settings.json` (or starts fresh if it doesn't exist / is malformed).
4. For each of the five hook events (`SessionStart`, `SessionEnd`, `PreToolUse`, `PostToolUse`, `PermissionRequest`), appends a hook entry pointing at the script — but only if it isn't already registered, so it's safe to run multiple times.
5. Writes the updated settings back.

---

### `scripts/sample-hooks/forward-event.sh`

The actual hook script that Claude Code executes on every event. Claude pipes a JSON payload to stdin. This script:

1. Checks if the Mission Control socket exists — if not, exits silently (daemon isn't running, no-op).
2. Reads stdin into `$INPUT`.
3. Passes the JSON through a small inline Python 3 script that adds `cwd` (current working directory) and `branch` (from `git rev-parse`) to the payload if they aren't already present.
4. Sends the enriched JSON as a single line to the Unix socket using `nc -U`.

Python 3 and `nc` (netcat) are both standard on macOS. The whole script is defensive — every failure path exits cleanly so it never blocks or errors out a Claude session.

---

## Client

### `client/src/types.ts`

A mirror of `server/types.ts` for the frontend. Kept as a separate file (rather than a shared package) to keep the build simple — just remember to keep them in sync if you change the server types.

---

### `client/src/hooks/useAppState.ts`

A React hook that owns the WebSocket connection and all state updates. Uses `useReducer` with a `WsMessage`-driven reducer:

- On mount, opens a WebSocket to `ws://{host}/ws`.
- On `message`, parses the JSON and dispatches to the reducer.
- On `close`, schedules a reconnect after 2 seconds (handles daemon restarts gracefully).
- The reducer handles all four message types: full state replacement, mission upsert (insert or update, re-sorted by activity), session upsert, and session removal.

The hook returns the current `AppState` — components just read from it, no prop drilling needed.

---

### `client/src/App.tsx`

The root component. Renders three things stacked vertically:

1. `TelemetryStrip` at the top — always visible.
2. `MissionList` on the left — 240px fixed width.
3. `MissionDetail` on the right — fills remaining space.

Selection state (`selectedId`) lives here. If nothing is selected, it defaults to the first mission in the list. If there are no missions at all, it shows an empty state with a 🛰 icon.

---

### `client/src/components/TelemetryStrip.tsx`

The narrow bar at the top of the app. Shows all currently active Claude sessions as pill-shaped badges. Each badge has:

- A colored pulsing dot (blue = thinking, yellow = running tool, orange = waiting for permission, dim = idle).
- The first 8 characters of the session ID.
- The current status label.
- The tool name if the last event was a tool use.

When there are no active sessions, shows a quiet "start one in your terminal" message.

---

### `client/src/components/MissionList.tsx`

The left sidebar. Renders a scrollable list of mission buttons sorted by recent activity (the store handles the sort). Each item shows:

- A colored status dot (green = active, yellow = cooling, dim = idle).
- The branch name in accent blue.
- The mission title (branch name by default, or the first line of the earliest task/idea note if Backbrain has data).
- The repo folder name.
- Colored badge pills for `bugs`, `active`, and `notes` when applicable.

The selected item gets a left accent border and a slightly lighter background.

---

### `client/src/components/MissionDetail.tsx`

The main right panel for a selected mission. Split into:

- A header with the mission title, repo name, branch, and a status badge (● EXECUTING / ◌ COOLING DOWN / ○ IDLE).
- A narrow left context panel (260px) showing Backbrain notes grouped into TASKS, BUGS, and NOTES sections. Only renders if there are notes.
- A main flight recorder area taking the rest of the width, which renders the `Timeline` component.

---

### `client/src/components/Timeline.tsx`

Renders the unified chronological list of events. Each row shows a timestamp, a colored event type label, and a summary. Rows are clickable to expand:

- Claude events expand to show the raw tool input/output as formatted JSON.
- Backbrain notes expand to show the full note text.
- Git commits are not expandable (hash + message is the full info).

Color coding: green = SessionStart, dim = SessionEnd, yellow = tool use, orange = permission request, blue = other Claude events, red/blue/dim for notes by tag.

---

## Config files

### `config/server.json`
```json
{ "port": 4321, "socketPath": "/tmp/backbrain-mc.sock" }
```

### `config/projects.json`
```json
{ "watchDirs": [] }
```
Add absolute paths to your project directories here to tell the daemon exactly where to look. If left empty, it auto-discovers by scanning `$HOME` two levels deep for `.bb/` directories.

---

## Build & publish

### `package.json`

Key fields for shipping:

- `name: "backbrain-mc"` — the npm package name
- `bin: { "backbrain-mc": "./dist/backbrain-mc" }` — registers the CLI command on install
- `files` — controls what gets published: `dist/`, `client/dist/`, `scripts/`, `config/`, `README.md`
- `prepublishOnly` — runs `bun run build` automatically before every `npm publish`

Build pipeline (`bun run build`):
1. `build:client` — Vite builds the React app into `client/dist/`
2. `build:server` — `bun build --compile` bundles `server/cli.ts` + the Bun runtime into a single self-contained binary at `dist/backbrain-mc`
3. `build:copy-client` — copies `client/dist/` to `dist/client/` so the binary can find it at runtime

### `.npmignore`

Excludes source files (`server/`, `client/src/`, `scripts/*.ts`), dev config, and `node_modules` from the published package. Only the compiled artifacts ship.

### `tsconfig.json`

Root TypeScript config covering `server/**/*.ts` and `scripts/**/*.ts`. Uses `"types": ["bun-types"]` so Bun globals (`Bun`, `import.meta.dir`, etc.) are typed correctly. Requires `@types/bun` to be installed (`bun install`).

---

## Data flow summary

```
Claude fires hook
  → forward-event.sh enriches JSON with cwd + branch
  → sends to Unix socket
  → hooks-socket.ts parses + calls ingestClaudeEvent()
  → missions-store updates mission + session state
  → broadcasts WsMessage to all subscribers
  → index.ts fans out to all WebSocket clients
  → useAppState reducer updates React state
  → components re-render

Every 30s:
  → refreshAll() scans watchDirs (or auto-discovers)
  → reads .bb/dumps/*.json → ingestNotes()
  → runs git log → ingestCommits()
  → same broadcast path as above
```

---

## What's not built yet (v1 gaps)

These are called out in the readme roadmap and are not implemented:

- Permission approve/deny from the UI (PermissionRequest events are tracked but there's no response mechanism).
- Creating Backbrain notes from the UI.
- Mission scoring / resumability ranking.
- Native desktop wrapper (Electron/Electrobun).
- Multi-agent integrations (Zed, Cursor, etc.).
