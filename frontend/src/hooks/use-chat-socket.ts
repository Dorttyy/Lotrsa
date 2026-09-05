import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { getAuthToken, wsUrl } from "@/src/utils/api";

export interface ChatEvent {
  type: string;
  conversation_id?: string;
  ids?: unknown;
  reader_id?: string;
  read_at?: string;
  message?: {
    id: string;
    conversation_id: string;
    sender_id: string;
    text: string;
    created_at: string;
  };
}

/** Connects to the chat WebSocket while mounted; reconnects on drops. */
export function useChatSocket(onEvent: (event: ChatEvent) => void) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!getAuthToken()) return;
    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let ping: ReturnType<typeof setInterval> | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return;
      }
      ws = new WebSocket(wsUrl());
      const socket = ws;
      socket.onopen = () => {
        // Keepalive: mobile carriers drop idle sockets, which would silently
        // stop live message/room updates.
        if (ping) clearInterval(ping);
        ping = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            try {
              socket.send(JSON.stringify({ type: "ping" }));
            } catch {
              // closing; onclose reconnects
            }
          }
        }, 25000);
      };
      socket.onmessage = (e) => {
        try {
          handlerRef.current(JSON.parse(e.data));
        } catch {
          // ignore malformed events
        }
      };
      socket.onclose = () => {
        if (ping) {
          clearInterval(ping);
          ping = null;
        }
        if (!closed) retryTimer = setTimeout(connect, 3000);
      };
    };
    connect();

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state !== "active" || closed) return;
      if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        if (retryTimer) clearTimeout(retryTimer);
        connect();
      }
    });

    return () => {
      closed = true;
      appStateSub.remove();
      if (retryTimer) clearTimeout(retryTimer);
      if (ping) clearInterval(ping);
      ws?.close();
    };
  }, []);
}
