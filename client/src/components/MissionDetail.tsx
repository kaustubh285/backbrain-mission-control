import type { Mission, BackbrainNote } from "../types";
import { Timeline } from "./Timeline";

const STATUS_LABEL = {
  active:  "● EXECUTING",
  cooling: "◌ COOLING DOWN",
  idle:    "○ IDLE",
};

const STATUS_COLOR = {
  active:  "var(--green)",
  cooling: "var(--amber)",
  idle:    "var(--text-dim)",
};

interface Props {
  mission: Mission;
}

export function MissionDetail({ mission }: Props) {
  const taskNotes  = mission.notes.filter((n) => n.tags.includes("tasks"));
  const bugNotes   = mission.notes.filter((n) => n.tags.includes("bugs"));
  const otherNotes = mission.notes
    .filter((n) => !n.tags.includes("tasks") && !n.tags.includes("bugs"))
    .slice(0, 5);

  const hasContext = taskNotes.length > 0 || bugNotes.length > 0 || otherNotes.length > 0;

  return (
    <div style={s.container}>
      {/* ── Header ── */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <h1 style={s.title}>{mission.title}</h1>
          <div style={s.sub}>
            <span style={s.repo}>{mission.repoPath.split("/").pop()}</span>
            <span style={s.sep} aria-hidden="true">/</span>
            <span style={s.branch}>{mission.branch}</span>
          </div>
        </div>
        <div
          style={{
            ...s.statusBadge,
            color: STATUS_COLOR[mission.status],
            borderColor: STATUS_COLOR[mission.status],
          }}
          aria-label={`Status: ${STATUS_LABEL[mission.status]}`}
        >
          {STATUS_LABEL[mission.status]}
        </div>
      </header>

      {/* ── Body ── */}
      <div style={s.body}>
        {/* Context panel — only shown when there are notes */}
        {hasContext && (
          <aside style={s.context} aria-label="Mission context">
            {taskNotes.length > 0 && (
              <NoteSection title="Tasks" color="var(--cyan)" icon="◈" notes={taskNotes} />
            )}
            {bugNotes.length > 0 && (
              <NoteSection title="Bugs" color="var(--red)" icon="◉" notes={bugNotes} />
            )}
            {otherNotes.length > 0 && (
              <NoteSection title="Notes" color="var(--text-mid)" icon="◇" notes={otherNotes} />
            )}
          </aside>
        )}

        {/* Flight recorder */}
        <section style={s.timelineSection} aria-label="Flight recorder timeline">
          <div style={s.sectionHeader}>
            <span style={s.sectionLabel}>FLIGHT RECORDER</span>
            <span style={s.eventCount}>{mission.timeline.length} events</span>
          </div>
          <div style={s.timelineScroll}>
            <Timeline items={mission.timeline} />
          </div>
        </section>
      </div>
    </div>
  );
}

function NoteSection({
  title,
  color,
  icon,
  notes,
}: {
  title: string;
  color: string;
  icon: string;
  notes: BackbrainNote[];
}) {
  return (
    <div style={ns.section}>
      <div style={{ ...ns.sectionHeader, color }}>
        <span aria-hidden="true">{icon}</span>
        <span>{title.toUpperCase()}</span>
      </div>
      {notes.map((n) => (
        <div key={n.id} style={ns.noteRow}>
          {n.text.split("\n")[0].slice(0, 120)}
        </div>
      ))}
    </div>
  );
}

const ns = {
  section: {
    marginBottom: "1.25rem",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    marginBottom: "0.4rem",
    paddingBottom: "0.3rem",
    borderBottom: "1px solid var(--border)",
  },
  noteRow: {
    padding: "0.3rem 0.5rem",
    marginBottom: "2px",
    background: "var(--bg3)",
    borderRadius: "4px",
    border: "1px solid var(--border)",
    color: "var(--text)",
    fontSize: "12px",
    lineHeight: 1.4,
    cursor: "default",
    transition: "background 0.1s",
  },
};

const s = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
    minWidth: 0,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "0.875rem 1.25rem",
    borderBottom: "1px solid var(--border)",
    flexShrink: 0,
    gap: "1rem",
  },
  headerLeft: {
    minWidth: 0,
    flex: 1,
  },
  title: {
    fontSize: "16px",
    fontWeight: 600,
    color: "var(--text)",
    marginBottom: "0.2rem",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  sub: {
    display: "flex",
    gap: "0.35rem",
    alignItems: "center",
    fontSize: "12px",
  },
  repo: {
    color: "var(--text-dim)",
  },
  sep: {
    color: "var(--border-mid)",
  },
  branch: {
    color: "var(--cyan)",
    fontFamily: "monospace",
    fontSize: "11px",
  },
  statusBadge: {
    fontSize: "10px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    padding: "0.2rem 0.65rem",
    border: "1px solid",
    borderRadius: "20px",
    flexShrink: 0,
    whiteSpace: "nowrap" as const,
    alignSelf: "flex-start",
  },
  body: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
  },
  context: {
    width: 240,
    flexShrink: 0,
    padding: "1rem",
    borderRight: "1px solid var(--border)",
    overflowY: "auto" as const,
  },
  timelineSection: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
    minWidth: 0,
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.6rem 1rem",
    borderBottom: "1px solid var(--border)",
    flexShrink: 0,
  },
  sectionLabel: {
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.14em",
    color: "var(--text-dim)",
    textTransform: "uppercase" as const,
  },
  eventCount: {
    fontSize: "10px",
    color: "var(--text-dim)",
  },
  timelineScroll: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "0 1rem",
  },
};
