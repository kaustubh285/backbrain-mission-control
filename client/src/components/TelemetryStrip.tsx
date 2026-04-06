import type { ActiveSession } from "../types";
import { StatusDot } from "./StatusDot";

const STATUS_LABEL: Record<ActiveSession["status"], string> = {
  thinking:             "Thinking",
  "running-tool":       "Running tool",
  "waiting-permission": "Awaiting permission",
  idle:                 "Idle",
};

interface Props {
  sessions: ActiveSession[];
}

export function TelemetryStrip({ sessions }: Props) {
  return (
    <div style={s.strip} role="status" aria-label="Active Claude sessions">
      {sessions.length === 0 ? (
        <span style={s.empty}>
          🛰&nbsp; No active Claude sessions — start one in your terminal
        </span>
      ) : (
        <>
          <span style={s.liveLabel} aria-hidden="true">LIVE</span>
          {sessions.map((session) => (
            <SessionPill key={session.sessionId} session={session} />
          ))}
        </>
      )}
    </div>
  );
}

function SessionPill({ session }: { session: ActiveSession }) {
  const label = STATUS_LABEL[session.status];
  return (
    <div
      style={s.pill}
      title={`Session ${session.sessionId} — ${label}`}
      aria-label={`Session ${session.sessionId.slice(0, 8)}, ${label}`}
    >
      <StatusDot status={session.status} size={7} />
      <span style={s.sessionId}>{session.sessionId.slice(0, 8)}</span>
      <span style={{ ...s.statusLabel, color: statusColor(session.status) }}>
        {label}
      </span>
      {session.lastEvent?.toolName && (
        <span style={s.toolName}>· {session.lastEvent.toolName}</span>
      )}
    </div>
  );
}

function statusColor(status: ActiveSession["status"]) {
  switch (status) {
    case "thinking":             return "var(--cyan2)";
    case "running-tool":         return "var(--amber)";
    case "waiting-permission":   return "var(--orange)";
    default:                     return "var(--text-dim)";
  }
}

const s = {
  strip: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0 1rem",
    height: "36px",
    background: "var(--bg2)",
    borderBottom: "1px solid var(--border)",
    boxShadow: "0 1px 0 0 rgba(79,209,197,0.06)",
    overflowX: "auto" as const,
    flexShrink: 0,
  },
  empty: {
    color: "var(--text-dim)",
    fontSize: "12px",
    letterSpacing: "0.01em",
  },
  liveLabel: {
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.14em",
    color: "var(--green)",
    flexShrink: 0,
    paddingRight: "0.25rem",
  },
  pill: {
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.2rem 0.65rem",
    background: "var(--bg3)",
    border: "1px solid var(--border-mid)",
    borderRadius: "20px",
    whiteSpace: "nowrap" as const,
    fontSize: "12px",
  },
  sessionId: {
    color: "var(--text-mid)",
    fontVariantNumeric: "tabular-nums",
    fontFamily: "monospace",
    fontSize: "11px",
  },
  statusLabel: {
    fontSize: "11px",
  },
  toolName: {
    color: "var(--text-dim)",
    fontSize: "11px",
  },
};
