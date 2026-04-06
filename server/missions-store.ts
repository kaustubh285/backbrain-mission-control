import type {
  Mission,
  ActiveSession,
  ClaudeEvent,
  BackbrainNote,
  GitCommit,
  AppState,
  WsMessage,
} from "./types";

const missions = new Map<string, Mission>();
const sessions = new Map<string, ActiveSession>();
const subscribers = new Set<(msg: WsMessage) => void>();

export function subscribe(fn: (msg: WsMessage) => void) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

function broadcast(msg: WsMessage) {
  for (const fn of subscribers) fn(msg);
}

export function getState(): AppState {
  return {
    missions: Array.from(missions.values()).sort(
      (a, b) => b.lastActivity - a.lastActivity
    ),
    activeSessions: Array.from(sessions.values()),
  };
}

function missionId(repoPath: string, branch: string) {
  return `${repoPath}::${branch}`;
}

function getOrCreateMission(repoPath: string, branch: string): Mission {
  const id = missionId(repoPath, branch);
  if (!missions.has(id)) {
    missions.set(id, {
      id,
      repoPath,
      branch,
      title: branch,
      status: "idle",
      lastActivity: Date.now(),
      notes: [],
      timeline: [],
      activeSessions: [],
    });
  }
  return missions.get(id)!;
}

export function ingestClaudeEvent(event: ClaudeEvent) {
  const repoPath = event.workingDir ?? "unknown";
  const branch = event.branch ?? "unknown";
  const mission = getOrCreateMission(repoPath, branch);

  mission.timeline.unshift({ kind: "claude", event });
  mission.lastActivity = event.timestamp;

  // Update session
  let session = sessions.get(event.sessionId);
  if (!session) {
    session = { sessionId: event.sessionId, missionId: mission.id, status: "idle" };
    sessions.set(event.sessionId, session);
  }
  session.missionId = mission.id;
  session.lastEvent = event;

  switch (event.type) {
    case "SessionStart":
      mission.status = "active";
      if (!mission.activeSessions.includes(event.sessionId))
        mission.activeSessions.push(event.sessionId);
      session.status = "idle";
      break;
    case "SessionEnd":
      mission.activeSessions = mission.activeSessions.filter(
        (s) => s !== event.sessionId
      );
      mission.status = mission.activeSessions.length > 0 ? "active" : "cooling";
      sessions.delete(event.sessionId);
      broadcast({ type: "session-removed", payload: { sessionId: event.sessionId } });
      broadcast({ type: "mission-updated", payload: mission });
      return;
    case "PreToolUse":
      session.status = "running-tool";
      mission.status = "active";
      break;
    case "PostToolUse":
      session.status = "idle";
      break;
    case "PermissionRequest":
      session.status = "waiting-permission";
      break;
    default:
      session.status = "thinking";
  }

  broadcast({ type: "mission-updated", payload: mission });
  broadcast({ type: "session-updated", payload: session });
}

export function ingestNotes(repoPath: string, branch: string, notes: BackbrainNote[]) {
  const mission = getOrCreateMission(repoPath, branch);
  mission.notes = notes;

  // Derive title from earliest task/idea note
  const titleNote = [...notes]
    .sort((a, b) => a.createdAt - b.createdAt)
    .find((n) => n.tags.includes("tasks") || n.tags.includes("ideas"));
  if (titleNote) mission.title = titleNote.text.split("\n")[0].slice(0, 80);

  // Merge notes into timeline (deduplicate by id)
  const existingNoteIds = new Set(
    mission.timeline
      .filter((t) => t.kind === "note")
      .map((t) => (t as { kind: "note"; note: BackbrainNote }).note.id)
  );
  for (const note of notes) {
    if (!existingNoteIds.has(note.id)) {
      mission.timeline.push({ kind: "note", note });
    }
  }
  mission.timeline.sort((a, b) => {
    const ta =
      a.kind === "claude"
        ? a.event.timestamp
        : a.kind === "note"
        ? a.note.createdAt
        : a.commit.timestamp;
    const tb =
      b.kind === "claude"
        ? b.event.timestamp
        : b.kind === "note"
        ? b.note.createdAt
        : b.commit.timestamp;
    return tb - ta;
  });

  broadcast({ type: "mission-updated", payload: mission });
}

export function ingestCommits(repoPath: string, branch: string, commits: GitCommit[]) {
  const mission = getOrCreateMission(repoPath, branch);
  const existingHashes = new Set(
    mission.timeline
      .filter((t) => t.kind === "commit")
      .map((t) => (t as { kind: "commit"; commit: GitCommit }).commit.hash)
  );
  for (const commit of commits) {
    if (!existingHashes.has(commit.hash)) {
      mission.timeline.push({ kind: "commit", commit });
    }
  }
  mission.timeline.sort((a, b) => {
    const ta =
      a.kind === "claude"
        ? a.event.timestamp
        : a.kind === "note"
        ? a.note.createdAt
        : a.commit.timestamp;
    const tb =
      b.kind === "claude"
        ? b.event.timestamp
        : b.kind === "note"
        ? b.note.createdAt
        : b.commit.timestamp;
    return tb - ta;
  });
  broadcast({ type: "mission-updated", payload: mission });
}
