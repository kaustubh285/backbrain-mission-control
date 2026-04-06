export type ClaudeEventType =
  | "SessionStart"
  | "SessionEnd"
  | "PreToolUse"
  | "PostToolUse"
  | "PermissionRequest"
  | "Unknown";

export interface ClaudeEvent {
  id: string;
  type: ClaudeEventType;
  sessionId: string;
  timestamp: number;
  workingDir?: string;
  branch?: string;
  toolName?: string;
  toolInput?: unknown;
  toolOutput?: unknown;
  raw: unknown;
}

export interface BackbrainNote {
  id: string;
  text: string;
  tags: string[];
  branch?: string;
  workingDir?: string;
  createdAt: number;
}

export interface GitCommit {
  hash: string;
  message: string;
  timestamp: number;
  author: string;
}

export type TimelineItem =
  | { kind: "claude"; event: ClaudeEvent }
  | { kind: "note"; note: BackbrainNote }
  | { kind: "commit"; commit: GitCommit };

export interface Mission {
  id: string; // `${repoPath}::${branch}`
  repoPath: string;
  branch: string;
  title: string;
  status: "active" | "idle" | "cooling";
  lastActivity: number;
  notes: BackbrainNote[];
  timeline: TimelineItem[];
  activeSessions: string[];
}

export interface ActiveSession {
  sessionId: string;
  missionId?: string;
  status: "thinking" | "running-tool" | "waiting-permission" | "idle";
  lastEvent?: ClaudeEvent;
}

export interface AppState {
  missions: Mission[];
  activeSessions: ActiveSession[];
}

// WebSocket message types sent to clients
export type WsMessage =
  | { type: "state"; payload: AppState }
  | { type: "mission-updated"; payload: Mission }
  | { type: "session-updated"; payload: ActiveSession }
  | { type: "session-removed"; payload: { sessionId: string } };
