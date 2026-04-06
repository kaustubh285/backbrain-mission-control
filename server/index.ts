import { config } from "./config";
import { startHooksSocket, stopHooksSocket } from "./hooks-socket";
import { getState, subscribe, ingestNotes, ingestCommits } from "./missions-store";
import { readBackbrainNotes, discoverBbDirs } from "./backbrain";
import { getCurrentBranch, getRecentCommits, getRepoRoot } from "./git";
import type { WsMessage } from "./types";
import { join } from "node:path";
import { existsSync } from "node:fs";

// ── WebSocket clients ────────────────────────────────────────────────────────
type WsClient = { send(data: string): void };
const wsClients = new Set<WsClient>();

subscribe((msg: WsMessage) => {
  const payload = JSON.stringify(msg);
  for (const ws of wsClients) {
    try { ws.send(payload); } catch {}
  }
});

// ── Periodic Backbrain + git refresh ────────────────────────────────────────
async function refreshProjectData(projectDir: string) {
  const root = (await getRepoRoot(projectDir)) ?? projectDir;
  const branch = await getCurrentBranch(root);
  if (!branch) return;

  // Notes live in the original projectDir's .bb/, not necessarily the repo root
  const notes = readBackbrainNotes(projectDir, branch);
  console.log(`[refresh] ${projectDir.split("/").pop()} @ ${branch} — ${notes.length} notes`);
  ingestNotes(root, branch, notes);

  const commits = await getRecentCommits(root);
  console.log(`[refresh] ${projectDir.split("/").pop()} @ ${branch} — ${commits.length} commits`);
  ingestCommits(root, branch, commits);
}

async function refreshAll() {
  const dirs: string[] =
    config.watchDirs.length
      ? config.watchDirs
      : discoverBbDirs(process.env.HOME ?? "/");

  await Promise.allSettled(dirs.map(refreshProjectData));
}

refreshAll();
setInterval(refreshAll, 30_000);

// ── HTTP + WebSocket server ──────────────────────────────────────────────────
// When compiled: binary lives in dist/, client is at dist/client/
// When running from source: server/ dir, client is at ../client/dist/
const clientDist = existsSync(join(import.meta.dir, "client"))
  ? join(import.meta.dir, "client")           // compiled binary layout
  : join(import.meta.dir, "../client/dist");  // dev source layout
const hasClientDist = existsSync(clientDist);

const server = Bun.serve({
  port: config.port,

  fetch(req: Request, server: ReturnType<typeof Bun.serve>) {
    const url = new URL(req.url);

    if (req.headers.get("upgrade") === "websocket") {
      const ok = server.upgrade(req);
      return ok ? undefined : new Response("WebSocket upgrade failed", { status: 400 });
    }

    if (url.pathname === "/api/state") {
      return Response.json(getState());
    }

    if (hasClientDist) {
      const filePath = url.pathname === "/" ? "/index.html" : url.pathname;
      const file = Bun.file(join(clientDist, filePath));
      return new Response(file);
    }

    return new Response(
      `<html><body style="background:#05060a;color:#4fd1c5;font-family:monospace;padding:2rem">
        <h1>🛰 Backbrain Mission Control</h1>
        <p>Daemon is running. Start the frontend: <code>bun run dev:client</code></p>
        <p>State API: <a href="/api/state" style="color:#4fd1c5">/api/state</a></p>
      </body></html>`,
      { headers: { "content-type": "text/html; charset=utf-8" } }
    );
  },

  websocket: {
    open(ws: WsClient) {
      wsClients.add(ws);
      ws.send(JSON.stringify({ type: "state", payload: getState() }));
    },
    close(ws: WsClient) {
      wsClients.delete(ws);
    },
    message(_ws: WsClient, _msg: string | Buffer) {
      // read-only in v1
    },
  },
});

startHooksSocket();

console.log(`  Mission Control running at http://localhost:${config.port}`);
console.log(`   Hooks socket: ${config.socketPath}`);

process.on("SIGINT", () => {
  stopHooksSocket();
  server.stop();
  process.exit(0);
});
