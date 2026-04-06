import { useState } from "react";
import type { TimelineItem } from "../types";

interface Props {
  items: TimelineItem[];
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// ── Event type metadata ──────────────────────────────────────────────────────

type EventMeta = { label: string; color: string; summary: (item: TimelineItem) => string };

function getClaudeMeta(item: Extract<TimelineItem, { kind: "claude" }>): EventMeta {
  const { event } = item;
  switch (event.type) {
    case "SessionStart":
      return { label: "Session start", color: "var(--green)",    summary: () => "Started session" };
    case "SessionEnd":
      return { label: "Session end",   color: "var(--text-dim)", summary: () => "Session ended" };
    case "PreToolUse":
      return { label: "Tool call",     color: "var(--amber)",    summary: () => event.toolName ? `Using ${event.toolName}` : "Tool call" };
    case "PostToolUse":
      return { label: "Tool result",   color: "var(--amber)",    summary: () => event.toolName ? `Finished ${event.toolName}` : "Tool result" };
    case "PermissionRequest":
      return { label: "Permission",    color: "var(--orange)",   summary: () => event.toolName ? `Permission: ${event.toolName}` : "Permission request" };
    default:
      return { label: event.type,      color: "var(--cyan2)",    summary: () => event.type };
  }
}

// ── Row components ───────────────────────────────────────────────────────────

function ClaudeRow({ item }: { item: Extract<TimelineItem, { kind: "claude" }> }) {
  const [expanded, setExpanded] = useState(false);
  const meta = getClaudeMeta(item);
  const hasDetail = item.event.toolInput != null || item.event.toolOutput != null;

  return (
    <div style={s.row}>
      <button
        style={s.rowMain}
        onClick={() => hasDetail && setExpanded((e) => !e)}
        aria-expanded={hasDetail ? expanded : undefined}
        aria-label={`${meta.label}: ${meta.summary(item)}`}
      >
        <span style={s.time}>{formatTime(item.event.timestamp)}</span>
        <span style={{ ...s.pill, background: `${meta.color}18`, color: meta.color, borderColor: `${meta.color}40` }}>
          {meta.label}
        </span>
        <span style={s.summary}>{meta.summary(item)}</span>
        {hasDetail && (
          <span style={s.expandHint} aria-hidden="true">{expanded ? "▲" : "▼"}</span>
        )}
      </button>
      {expanded && (
        <div style={s.expandedCard}>
          <pre style={s.pre}>
            {JSON.stringify({ input: item.event.toolInput, output: item.event.toolOutput }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function NoteRow({ item }: { item: Extract<TimelineItem, { kind: "note" }> }) {
  const [expanded, setExpanded] = useState(false);
  const { note } = item;
  const color = note.tags.includes("bugs")
    ? "var(--red)"
    : note.tags.includes("tasks")
    ? "var(--cyan)"
    : "var(--text-mid)";
  const label = note.tags.length > 0 ? note.tags[0] : "note";

  return (
    <div style={s.row}>
      <button
        style={s.rowMain}
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-label={`Note (${label}): ${note.text.split("\n")[0]}`}
      >
        <span style={s.time}>{formatTime(note.createdAt)}</span>
        <span style={{ ...s.pill, background: `${color}18`, color, borderColor: `${color}40` }}>
          {label}
        </span>
        <span style={s.summary}>{note.text.split("\n")[0].slice(0, 90)}</span>
        <span style={s.expandHint} aria-hidden="true">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div style={s.expandedCard}>
          <p style={{ fontSize: "12px", color: "var(--text)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {note.text}
          </p>
          {note.tags.length > 0 && (
            <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.3rem" }}>
              {note.tags.map((t) => (
                <span key={t} style={{ fontSize: "10px", color: "var(--text-dim)", background: "var(--bg)", padding: "1px 6px", borderRadius: "3px", border: "1px solid var(--border)" }}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CommitRow({ item }: { item: Extract<TimelineItem, { kind: "commit" }> }) {
  const { commit } = item;
  return (
    <div style={s.commitRow} aria-label={`Commit: ${commit.message}`}>
      <span style={s.commitGlyph} aria-hidden="true">⬡</span>
      <span style={s.commitTime}>{formatTime(commit.timestamp)}</span>
      <span style={s.commitHash}>{commit.hash.slice(0, 7)}</span>
      <span style={s.commitMsg}>{commit.message}</span>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

export function Timeline({ items }: Props) {
  if (items.length === 0) {
    return (
      <div style={{ color: "var(--text-dim)", padding: "1.5rem 0", fontSize: "12px" }}>
        No events yet.
      </div>
    );
  }

  return (
    <div style={s.container} role="list" aria-label="Timeline events">
      {items.map((item, i) => (
        <div key={i} role="listitem">
          {item.kind === "claude"  && <ClaudeRow  item={item} />}
          {item.kind === "note"   && <NoteRow    item={item} />}
          {item.kind === "commit" && <CommitRow  item={item} />}
        </div>
      ))}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    paddingTop: "0.5rem",
    paddingBottom: "2rem",
    // Subtle left timeline rule
    borderLeft: "1px solid var(--border)",
    marginLeft: "0.5rem",
    paddingLeft: "0",
  },
  row: {
    display: "flex",
    flexDirection: "column" as const,
    borderBottom: "1px solid var(--border)",
  },
  rowMain: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    padding: "0.45rem 0.75rem",
    textAlign: "left" as const,
    width: "100%",
    cursor: "pointer",
    transition: "background 0.1s",
    borderRadius: "0",
    minWidth: 0,
  },
  time: {
    color: "var(--text-dim)",
    fontSize: "11px",
    fontFamily: "monospace",
    fontVariantNumeric: "tabular-nums",
    flexShrink: 0,
    width: "6.5rem",
  },
  pill: {
    fontSize: "10px",
    fontWeight: 600,
    letterSpacing: "0.04em",
    padding: "1px 7px",
    borderRadius: "20px",
    border: "1px solid",
    flexShrink: 0,
    whiteSpace: "nowrap" as const,
  },
  summary: {
    color: "var(--text)",
    fontSize: "12px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    flex: 1,
    minWidth: 0,
  },
  expandHint: {
    color: "var(--text-dim)",
    fontSize: "9px",
    flexShrink: 0,
  },
  expandedCard: {
    margin: "0 0.75rem 0.5rem calc(6.5rem + 0.6rem + 0.75rem)",
    padding: "0.65rem 0.75rem",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-mid)",
    borderRadius: "6px",
  },
  pre: {
    fontSize: "11px",
    color: "var(--text-mid)",
    overflowX: "auto" as const,
    whiteSpace: "pre-wrap" as const,
    lineHeight: 1.5,
    fontFamily: "monospace",
  },
  // Commits — compact, recessed, no pill
  commitRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
    padding: "0.2rem 0.75rem",
    borderBottom: "1px solid var(--border)",
    opacity: 0.55,
  },
  commitGlyph: {
    color: "var(--text-dim)",
    fontSize: "9px",
    flexShrink: 0,
  },
  commitTime: {
    color: "var(--text-dim)",
    fontSize: "10px",
    fontFamily: "monospace",
    fontVariantNumeric: "tabular-nums",
    flexShrink: 0,
    width: "6rem",
  },
  commitHash: {
    color: "var(--text-dim)",
    fontSize: "10px",
    fontFamily: "monospace",
    flexShrink: 0,
    letterSpacing: "0.03em",
  },
  commitMsg: {
    color: "var(--text-mid)",
    fontSize: "11px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    flex: 1,
    minWidth: 0,
  },
};
