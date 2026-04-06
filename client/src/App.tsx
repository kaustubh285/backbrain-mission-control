import { useState } from "react";
import { useAppState } from "./hooks/useAppState";
import { TelemetryStrip } from "./components/TelemetryStrip";
import { MissionList } from "./components/MissionList";
import { MissionDetail } from "./components/MissionDetail";

export default function App() {
  const state = useAppState();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected =
    state.missions.find((m) => m.id === selectedId) ?? state.missions[0] ?? null;

  return (
    <div style={s.root}>
      <TelemetryStrip sessions={state.activeSessions} />

      <div style={s.main}>
        <MissionList
          missions={state.missions}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
        />

        <main style={s.detail}>
          {selected ? (
            <MissionDetail mission={selected} />
          ) : (
            <EmptyState />
          )}
        </main>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={s.empty} role="status">
      <span style={s.emptyIcon} aria-hidden="true">🛰</span>
      <span style={s.emptyTitle}>Waiting for missions</span>
      <span style={s.emptyHint}>
        Start a Claude Code session in a project with Backbrain initialized.
      </span>
    </div>
  );
}

const s = {
  root: {
    height: "100%",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  },
  main: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
    minHeight: 0,
  },
  detail: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    minWidth: 0,
  },
  empty: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    padding: "2rem",
    textAlign: "center" as const,
  },
  emptyIcon: {
    fontSize: "2.5rem",
    marginBottom: "0.25rem",
    filter: "grayscale(0.4)",
  },
  emptyTitle: {
    color: "var(--text-mid)",
    fontSize: "14px",
    fontWeight: 500,
  },
  emptyHint: {
    color: "var(--text-dim)",
    fontSize: "12px",
    maxWidth: "320px",
    lineHeight: 1.6,
  },
};
