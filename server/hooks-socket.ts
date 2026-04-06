import { unlinkSync, existsSync } from "fs";
import { ingestClaudeEvent } from "./missions-store";
import type { ClaudeEvent, ClaudeEventType } from "./types";
import { config } from "./config";

let socketServer: ReturnType<typeof Bun.listen> | null = null;

function parseHookPayload(raw: unknown): ClaudeEvent | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  return {
    id: crypto.randomUUID(),
    type: (r.type ?? r.event ?? "Unknown") as ClaudeEventType,
    sessionId: String(r.session_id ?? r.sessionId ?? "unknown"),
    timestamp: typeof r.timestamp === "number" ? r.timestamp : Date.now(),
    workingDir: r.cwd ? String(r.cwd) : undefined,
    branch: r.branch ? String(r.branch) : undefined,
    toolName: r.tool_name ? String(r.tool_name) : undefined,
    toolInput: r.tool_input,
    toolOutput: r.tool_output ?? r.tool_result,
    raw,
  };
}

export function startHooksSocket() {
  if (existsSync(config.socketPath)) {
    try { unlinkSync(config.socketPath); } catch {}
  }

  socketServer = Bun.listen<{ buf: string }>({
    unix: config.socketPath,
    socket: {
      open(socket) {
        socket.data = { buf: "" };
      },
      data(socket, data) {
        socket.data.buf += new TextDecoder().decode(data);
        // Messages are newline-delimited JSON
        const lines = socket.data.buf.split("\n");
        socket.data.buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const payload = JSON.parse(line);
            const event = parseHookPayload(payload);
            if (event) ingestClaudeEvent(event);
          } catch (e) {
            console.error("[hooks-socket] parse error:", e);
          }
        }
      },
      error(socket, err) {
        console.error("[hooks-socket] error:", err);
      },
    },
  });

  console.log(`[hooks-socket] listening on ${config.socketPath}`);
  return socketServer;
}

export function stopHooksSocket() {
  socketServer?.stop();
  if (existsSync(config.socketPath)) {
    try { unlinkSync(config.socketPath); } catch {}
  }
}
