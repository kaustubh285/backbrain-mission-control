# Setup & Publishing Guide

---

## Development

### 1. Install dependencies

```bash
bun install
```

### 2. Start the daemon (Terminal 1)

```bash
bun run dev:server
```

Starts the Bun backend at `http://localhost:4321`.

### 3. Start the frontend dev server (Terminal 2)

```bash
bun run dev:client
```

Starts Vite at `http://localhost:4322` (proxies API/WS to the daemon).

### 4. Install Claude Code hooks

```bash
bun run install-hooks
```

Copies `scripts/sample-hooks/forward-event.sh` to `~/.claude/hooks/backbrain-mc/` and registers it in `~/.claude/settings.json` for these events: `SessionStart`, `SessionEnd`, `PreToolUse`, `PostToolUse`, `PermissionRequest`.

Restart any active Claude Code terminal sessions after running this.

### 5. Point at your projects (optional)

Edit `config/projects.json`:

```json
{ "watchDirs": ["/path/to/your/project"] }
```

If left empty, the daemon auto-discovers `.bb/` dirs under `$HOME`.

### Environment overrides

```bash
MC_PORT=5000 bun run dev:server
```

| Variable | Default | Description |
|---|---|---|
| `MC_PORT` | `4321` | HTTP/WebSocket port |
| `MC_SOCKET` | `/tmp/backbrain-mc.sock` | Unix socket path |

---

## Building for production / shipping

### Build everything

```bash
bun run build
```

This runs three steps in order:
1. `build:client` — Vite builds the React app into `client/dist/`
2. `build:server` — Bun compiles `server/cli.ts` into a self-contained binary at `dist/backbrain-mc`
3. `build:copy-client` — copies `client/dist/` into `dist/client/` so the binary can serve it

The result is a single `dist/backbrain-mc` binary that:
- Bundles the Bun runtime (no Bun install required on the user's machine)
- Serves the pre-built React UI statically
- Accepts subcommands (`start`, `install-hooks`)

### Test the production build locally

```bash
./dist/backbrain-mc               # start the daemon
./dist/backbrain-mc install-hooks # install Claude hooks
./dist/backbrain-mc --version
./dist/backbrain-mc --help
```

---

## Publishing to npm

### First time setup

1. Create an account at [npmjs.com](https://www.npmjs.com) if you don't have one
2. Log in:
   ```bash
   npm login
   ```
3. Update `package.json` — change the `repository.url` and `homepage` to your actual GitHub repo

### Publish

```bash
bun run build        # always build fresh before publishing
npm publish --access public
```

The `prepublishOnly` script runs `bun run build` automatically, so this is safe even if you forget to build first.

What gets published (defined by `files` in `package.json`):
- `dist/backbrain-mc` — the compiled binary
- `dist/client/` — the pre-built React UI
- `scripts/` — the Claude hook shell script
- `config/` — default config files
- `README.md`

Source files, `node_modules`, and dev config are excluded via `.npmignore`.

### Bumping versions

```bash
npm version patch   # 0.1.0 → 0.1.1
npm version minor   # 0.1.0 → 0.2.0
npm version major   # 0.1.0 → 1.0.0
```

Then publish as above.

---

## User install experience (after publishing)

### Install globally via npm

```bash
npm install -g backbrain-mc
```

Or with bun:

```bash
bun add -g backbrain-mc
```

### Use it

```bash
# First time: install Claude Code hooks
backbrain-mc install-hooks

# Start the dashboard
backbrain-mc

# Open http://localhost:4321 in your browser
```

### Override port

```bash
MC_PORT=5000 backbrain-mc
```

---

## Troubleshooting

- "No missions yet" — check `/api/state` in the browser for raw state. Either no `.bb/` dirs were found or hooks aren't firing yet.
- Hook not firing — verify `~/.claude/settings.json` has the hooks registered and you restarted your Claude terminal session.
- Port conflict — use `MC_PORT=5001 backbrain-mc`.
- Binary not found after `npm install -g` — make sure your npm global bin directory is on your `PATH` (`npm bin -g` shows the path).
