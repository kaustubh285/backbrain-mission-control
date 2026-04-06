import type { Mission } from "../types";
import { Badge } from "./Badge";

interface Props {
  missions: Mission[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const STATUS_BAR_COLOR = {
  active:  "var(--green)",
  cooling: "var(--amber)",
  idle:    "var(--bg-elevated)",
};

export function MissionList({ missions, selectedId, onSelect }: Props) {
  return (
    <nav
      aria-label="Missions"
      style={s.list}
    >
      <div style={s.header}>MISSIONS</div>

      {missions.length === 0 ? (
        <div style={s.empty}>
          <span style={{ fontSize: "20px", display: "block", marginBottom: "0.5rem" }}>🛰</span>
          No missions yet. Start a Claude Code session in a project with Backbrain initialized.
        </div>
      ) : (
        missions.map((m) => (
          <MissionRow
            key={m.id}
            mission={m}
            selected={m.id === selectedId}
            onSelect={onSelect}
          />
        ))
      )}
    </nav>
  );
}

function MissionRow({
  mission: m,
  selected,
  onSelect,
}: {
  mission: Mission;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const hasBugs  = m.notes.some((n) => n.tags.includes("bugs"));
  const hasTasks = m.notes.some((n) => n.tags.includes("tasks"));
  const hasNotes = m.notes.length > 0;

  return (
    <button
      style={{
        ...s.item,
        background: selected ? "var(--bg4)" : "transparent",
      }}
      onClick={() => onSelect(m.id)}
      aria-current={selected ? "true" : undefined}
      aria-label={`Mission: ${m.title}, branch ${m.branch}, status ${m.status}`}
    >
      {/* Left status bar */}
      <span
        aria-hidden="true"
        style={{
          ...s.statusBar,
          background: STATUS_BAR_COLOR[m.status],
          opacity: m.status === "idle" ? 0.3 : 1,
        }}
      />

      <div style={s.content}>
        {/* Title */}
        <div style={s.title}>{m.title}</div>

        {/* Repo + branch */}
        <div style={s.sub}>
          <span style={s.repo}>{m.repoPath.split("/").pop()}</span>
          <span style={s.branch}>{m.branch}</span>
        </div>

        {/* Badges */}
        {(hasBugs || hasTasks || hasNotes) && (
          <div style={s.badges}>
            {hasBugs  && <Badge label="BUGS"  color="var(--red)"      />}
            {hasTasks && <Badge label="TASKS" color="var(--cyan)"     />}
            {hasNotes && !hasTasks && <Badge label="NOTES" color="var(--text-dim)" />}
          </div>
        )}
      </div>
    </button>
  );
}

const s = {
  list: {
    width: 268,
    flexShrink: 0,
    borderRight: "1px solid var(--border)",
    overflowY: "auto" as const,
    display: "flex",
    flexDirection: "column" as const,
  },
  header: {
    padding: "0.65rem 1rem 0.5rem",
    fontSize: "9px",
    fontWeight: 600,
    letterSpacing: "0.14em",
    color: "var(--text-dim)",
    borderBottom: "1px solid var(--border)",
    textTransform: "uppercase" as const,
    flexShrink: 0,
  },
  empty: {
    padding: "1.25rem 1rem",
    color: "var(--text-dim)",
    fontSize: "12px",
    lineHeight: 1.6,
    textAlign: "center" as const,
  },
  item: {
    display: "flex",
    alignItems: "stretch",
    gap: 0,
    padding: 0,
    textAlign: "left" as const,
    borderBottom: "1px solid var(--border)",
    cursor: "pointer",
    transition: "background 0.12s",
    width: "100%",
  },
  statusBar: {
    width: 3,
    flexShrink: 0,
    borderRadius: "0 2px 2px 0",
    alignSelf: "stretch",
  },
  content: {
    flex: 1,
    padding: "0.6rem 0.75rem",
    minWidth: 0,
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.2rem",
  },
  title: {
    color: "var(--text)",
    fontSize: "13px",
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  sub: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
    fontSize: "11px",
    minWidth: 0,
  },
  repo: {
    color: "var(--text-dim)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    flexShrink: 1,
  },
  branch: {
    color: "var(--cyan)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
    maxWidth: "50%",
  },
  badges: {
    display: "flex",
    gap: "0.3rem",
    flexWrap: "wrap" as const,
    marginTop: "0.15rem",
  },
};
