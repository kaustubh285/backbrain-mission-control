Here’s a concrete first‑draft README you can drop into a new repo and iterate on.

You’ll probably rename a few things once you start coding, but this gives you a coherent story, install flow, and architecture.

***

# Backbrain Mission Control

> **Mission‑style telemetry for your AI copilots.**  
> A local dashboard that visualizes Claude Code sessions, Backbrain notes, and git activity as a single “flight recorder” for your work.

Backbrain Mission Control is a **local web app + Bun daemon** that shows:

- What Claude Code is working on *right now* in your terminal.  
- How that ties back to your **git branches**, files, and test runs.  
- The **Backbrain notes** and tasks that describe what you were trying to do.

It’s like mission control for your coding sessions: you see live “telemetry” from Claude, plus the human context from Backbrain.

***

## Features

- **Live Claude telemetry**  
  - Track active Claude Code CLI sessions in real time.  
  - See when Claude is “thinking”, running tools, or waiting for permission.  

- **Mission‑oriented view of your work**  
  - Group activity by repo + git branch as “missions”.  
  - Show recent Backbrain notes and tasks per mission, so you remember what you were doing.

- **Flight recorder timeline**  
  - Unified timeline of Claude events (hooks), Backbrain notes, and (optionally) git commits.  
  - Click into events to see tool usage, notes, and more detail.

- **Space‑inspired but focused**  
  - Dark theme, subtle orbital/mission metaphors.  
  - Data‑dense, keyboard‑friendly UI designed for daily use, not eye candy.

- **Local‑first, privacy‑first**  
  - All data stays on your machine.  
  - Reads from `~/.claude`, your `.bb/` directories, and git; no servers.

***

## How it works

Mission Control is split into two pieces:

1. **Bun daemon (backend)**  
   - Listens for **Claude Code hooks** via a Unix socket.  
   - Reads **Backbrain** data from `.bb/` in your projects.  
   - Reads **git** state (branch, repo path) for each mission.  
   - Exposes a WebSocket/HTTP API on `localhost` for the UI, using Bun’s built‑in HTTP server. [bun](https://bun.com/docs/runtime/http/server)

2. **React frontend (UI)**  
   - Single‑page app served by the daemon.  
   - Connects over WebSocket to receive live events.  
   - Renders mission list, flight recorder timeline, and live session strip.

Claude Code sends JSON event payloads to hooks; those hook scripts forward the payloads over a Unix socket to the daemon, which normalizes them and publishes them to the UI.

Backbrain Mission Control only reads Backbrain data; it does **not** write notes or modify your `.bb/` data in v1.

***

## Requirements

- **Claude Code CLI** installed and working in your terminal.  
- **Backbrain** installed (`bun add -g backbrain`) and initialized in whatever projects you care about.  
- **Bun** installed and on your `PATH`. [dev](https://dev.to/sadeedpv/build-an-http-server-in-bun-4k8l)
- macOS or Linux (Windows via WSL should work, but isn’t officially supported yet).

***

## Installation

> Note: This is a dev‑stage project; packaging into a `.dmg` / `.exe` comes later.

```bash
git clone https://github.com/you/backbrain-mission-control.git
cd backbrain-mission-control

# Install dependencies
bun install
```

***

## Quick start (development)

In one terminal, start the Bun daemon + API:

```bash
bun run dev:server
```

In another terminal, start the frontend dev server (if separate):

```bash
bun run dev:client
```

Then open:

```text
http://localhost:4321
```

You should see an empty Mission Control UI waiting for events.

(If you serve the frontend directly via Bun, a single `bun run dev` is enough; see `package.json`.)

***

## Claude hooks setup

Mission Control listens to **Claude Code hooks** to receive live events from your CLI sessions.

1. Find your Claude global config:

```bash
ls ~/.claude
# you should see settings.json, hooks/, projects/, etc.
```

2. Install the hooks:

The repo provides a small installer:

```bash
bun run install-hooks
```

This will:

- Copy hook scripts/binaries into `~/.claude/hooks/backbrain-mc/`.  
- Update `~/.claude/settings.json` to register the hooks for key events:
  - `SessionStart` / `SessionEnd`
  - `PermissionRequest`
  - `PreToolUse` / `PostToolUse`
  - Others as needed for richer telemetry

Each hook reads the Claude event JSON from stdin, then forwards it to the Mission Control daemon over a Unix socket.

> If you want to inspect or tweak the hooks, look in `scripts/hooks/` in this repo.

3. Restart your terminal Claude sessions

Open a new terminal and run Claude Code as usual (e.g. `claude` from a project).  
You should now see new missions and live events appear in the Mission Control UI as you work.

***

## Backbrain integration

Mission Control treats each **project + branch** as a “mission”.

It discovers Backbrain data by scanning for `.bb/` directories in your projects. For each mission, it:

- Reads notes from `.bb/dumps/*.json`.  
- Filters by `branch`, `workingDir`, and tags (`tasks`, `bugs`, `ideas`, etc.).  
- Uses your earliest `tasks`/`ideas` note on a branch as the mission’s “title” when possible.  

To get the best experience:

- Run `bb init` in your key repos.  
- Use `bb note -t` / `bb note -b` to log tasks and bugs as you work.  
- Use Backbrain’s MCP integration in your editors/agents if you like, but it isn’t required for Mission Control.

Mission Control never writes to `.bb/` in v1; it’s purely read‑only.

***

## UI tour

### Mission Overview

When you open the app, you’ll see:

- **Mission list** (left)  
  - Missions grouped by repo + branch.  
  - Sorted by recent activity (Claude events + Backbrain notes).  
  - Badges: `active`, `recent note`, `bugs`, etc.

- **Selected mission detail** (right)  
  - Large mission title (branch or friendly title from Backbrain).  
  - Status: “Executing”, “Idle”, or “Cooling down” (derived from recent activity).  
  - Context panel with:
    - Recent `tasks` notes.  
    - `bugs` notes.  
    - Last few generic notes for this mission.

### Flight Recorder timeline

Within the mission detail:

- Unified timeline of:
  - Claude events from hooks (session start/end, tool use, permission prompts).  
  - Backbrain notes.  
  - Git commits (optional, if enabled).

Clicking an item shows full details, such as:

- Tool name and short summary of input/output for `PreToolUse`/`PostToolUse`.  
- Full Backbrain note text and tags.  
- Commit hash and message.

### Live telemetry strip

At the top of the app:

- A narrow strip listing **currently active Claude sessions**:
  - Session ID / short name.  
  - Current status (thinking, running tool, waiting for permissions).  
  - Minimal animated indicator for in‑progress responses.

***

## Configuration

All configuration lives in `config/`:

- `config/server.json`  
  - Port for HTTP/WebSocket server (default: `4321`).  
  - Path to the Unix socket used by Claude hooks.

- `config/projects.json` (optional)  
  - Optional whitelist of directories to scan for `.bb/` and git repos.  
  - If omitted, the daemon can auto‑discover from your recent Backbrain projects.

You can override config with environment variables as needed:

```bash
MC_PORT=5000 bun run dev
```

***

## Roadmap

Planned features (in rough order):

1. **Better mission scoring**  
   - Use Backbrain’s Search 2.0 logic to rank missions by “resumability” (recent, same branch, open tasks).

2. **Interactive actions**  
   - Create Backbrain notes directly from the Mission Control UI.  
   - Copy pre‑filled prompts for Claude targeting a specific mission.

3. **Permission approvals**  
   - Approve/deny Claude Code permission prompts directly from the UI, via `PermissionRequest` hooks.

4. **Native desktop wrapper**  
   - Simple Electron/Electrobun wrapper so you can run Mission Control as a standalone desktop app. [javascript.plainenglish](https://javascript.plainenglish.io/building-desktop-apps-with-electron-js-part-1-getting-started-with-electron-dd3c914d24a9)

5. **More agent integrations**  
   - Surface when other tools (Zed, Cursor, etc.) touch Backbrain memory for the same mission.

***

## Development

Prerequisites:

- Bun (latest stable).  
- Node.js (optional, for some tooling).  
- Claude Code CLI.  
- Backbrain installed globally.

Common scripts:

```bash
# Start Bun daemon (API + WebSocket + static frontend)
bun run dev:server

# Start frontend in watch mode (if not served directly from Bun)
bun run dev:client

# Build frontend for production
bun run build:client

# Run tests
bun test
```

Project layout (subject to change):

```text
backbrain-mission-control/
├── server/
│   ├── index.ts          # Bun HTTP + WebSocket entry
│   ├── hooks-socket.ts   # Unix socket listener for Claude hooks
│   ├── missions-store.ts # In-memory state for missions/events
│   ├── backbrain.ts      # .bb/ reader and indexer
│   ├── git.ts            # Git branch/status utilities
│   └── config.ts
├── client/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── hooks/
│   └── vite.config.ts
├── scripts/
│   ├── install-hooks.ts  # Installs Claude hooks into ~/.claude
│   └── sample-hooks/     # Example hook scripts
└── README.md
```

***

## Status

This is an early‑stage, personal project. Expect:

- Breaking changes between minor versions.  
- Rough edges in hook installation and auto‑discovery.  

Feedback, issues, and ideas are very welcome. If you build your own custom hooks or integrations, open an issue or PR so others can learn from them.