import { useEffect, useReducer, useRef } from "react";
import type { AppState, WsMessage, Mission, ActiveSession } from "../types";

const INITIAL: AppState = { missions: [], activeSessions: [] };

type Action = WsMessage;

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "state":
      return action.payload;

    case "mission-updated": {
      const updated = action.payload as Mission;
      const idx = state.missions.findIndex((m) => m.id === updated.id);
      const missions =
        idx >= 0
          ? state.missions.map((m) => (m.id === updated.id ? updated : m))
          : [updated, ...state.missions];
      return {
        ...state,
        missions: missions.sort((a, b) => b.lastActivity - a.lastActivity),
      };
    }

    case "session-updated": {
      const updated = action.payload as ActiveSession;
      const idx = state.activeSessions.findIndex(
        (s) => s.sessionId === updated.sessionId
      );
      const activeSessions =
        idx >= 0
          ? state.activeSessions.map((s) =>
              s.sessionId === updated.sessionId ? updated : s
            )
          : [...state.activeSessions, updated];
      return { ...state, activeSessions };
    }

    case "session-removed":
      return {
        ...state,
        activeSessions: state.activeSessions.filter(
          (s) => s.sessionId !== action.payload.sessionId
        ),
      };

    default:
      return state;
  }
}

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function connect() {
      const protocol = location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${protocol}://${location.host}/ws`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const msg: WsMessage = JSON.parse(e.data);
          dispatch(msg);
        } catch {}
      };

      ws.onclose = () => {
        reconnectTimer.current = setTimeout(connect, 2000);
      };
    }

    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, []);

  return state;
}
