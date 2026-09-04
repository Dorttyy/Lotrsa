import { useCallback, useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";

import { proRtcUrl } from "@/src/utils/api";
import { audioSession } from "@/src/utils/incall";
import { getRTC, getIceConfig, iceConfigSync } from "@/src/utils/webrtc";

export interface RtcChatMsg {
  id: string;
  mine: boolean;
  text: string;
  name?: string;
}

/**
 * Free WebRTC classroom hook.
 *  - Signaling: our FastAPI room WebSocket (/api/pro/rtc/{room}). No API keys.
 *  - Media/peer connection: browser-native WebRTC on web, react-native-webrtc
 *    on installed builds. In Expo Go (no native module) it stays chat-only,
 *    degrading gracefully.
 *  - Real in-call text chat + presence works on every platform.
 */
export function useProRtc(room: string | undefined, displayName: string) {
  const [messages, setMessages] = useState<RtcChatMsg[]>([]);
  const [peerPresent, setPeerPresent] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<any>(null);
  const localRef = useRef<MediaStream | null>(null);
  const shouldOffer = useRef(false);
  const makingOffer = useRef(false);

  const send = useCallback((obj: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
  }, []);

  const sendChat = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t) return;
      setMessages((m) => [...m, { id: `${Date.now()}`, mine: true, text: t }]);
      send({ type: "chat", text: t, name: displayName });
    },
    [send, displayName],
  );

  // ---- WebRTC (web + native builds) ----
  const createPeer = useCallback(() => {
    const rtc = getRTC();
    if (!rtc) return null;
    const pc = new rtc.PC(iceConfigSync());
    pc.onicecandidate = (e: any) => {
      if (e.candidate) send({ type: "rtc_ice", candidate: e.candidate });
    };
    pc.ontrack = (e: any) => {
      setRemoteStream(e.streams[0]);
    };
    pc.onnegotiationneeded = async () => {
      try {
        if (!shouldOffer.current) return;
        makingOffer.current = true;
        await pc.setLocalDescription(await pc.createOffer());
        send({ type: "rtc_offer", sdp: pc.localDescription });
      } catch {
        // ignore
      } finally {
        makingOffer.current = false;
      }
    };
    const local = localRef.current;
    if (local) local.getTracks().forEach((tr) => pc.addTrack(tr, local));
    pcRef.current = pc;
    return pc;
  }, [send]);

  const initMedia = useCallback(async () => {
    const rtc = getRTC();
    if (!rtc) {
      setMediaError("Live video needs the installed app or a web browser");
      return;
    }
    try {
      // Prime the ICE cache (STUN/TURN from the server) before peering.
      await getIceConfig();
      // Android: request camera + mic at runtime before capture.
      if (Platform.OS === "android") {
        try {
          const res = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          ]);
          const granted =
            res[PermissionsAndroid.PERMISSIONS.CAMERA] ===
              PermissionsAndroid.RESULTS.GRANTED &&
            res[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
              PermissionsAndroid.RESULTS.GRANTED;
          if (!granted) {
            setMediaError("Camera/mic permission denied");
            return;
          }
        } catch {
          // fall through — getUserMedia will surface any remaining issue
        }
      }
      const stream: MediaStream = await rtc.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
      localRef.current = stream;
      setLocalStream(stream);
    } catch {
      setMediaError("Camera/mic permission denied");
    }
  }, []);

  const handleSignal = useCallback(
    async (data: any) => {
      const type = data.type;
      if (type === "chat") {
        setMessages((m) => [
          ...m,
          { id: `${Date.now()}-r`, mine: false, text: data.text, name: data.name },
        ]);
        return;
      }
      if (type === "rtc_welcome") {
        // If someone is already in the room, we are the caller.
        shouldOffer.current = (data.peers || 0) > 0;
        if (shouldOffer.current) {
          const pc = pcRef.current || createPeer();
          if (pc && localRef.current) {
            // trigger negotiationneeded via track add already done; force offer
            try {
              makingOffer.current = true;
              await pc.setLocalDescription(await pc.createOffer());
              send({ type: "rtc_offer", sdp: pc.localDescription });
            } catch {
              // ignore
            } finally {
              makingOffer.current = false;
            }
          }
        }
        return;
      }
      if (type === "rtc_peer_join") {
        setPeerPresent(true);
        if (!pcRef.current) createPeer();
        return;
      }
      if (type === "rtc_peer_leave") {
        setPeerPresent(false);
        setRemoteStream(null);
        return;
      }
      if (!getRTC()) return;
      if (type === "rtc_offer") {
        const pc = pcRef.current || createPeer();
        if (!pc) return;
        await pc.setRemoteDescription(data.sdp);
        await pc.setLocalDescription(await pc.createAnswer());
        send({ type: "rtc_answer", sdp: pc.localDescription });
        setPeerPresent(true);
      } else if (type === "rtc_answer") {
        const pc = pcRef.current;
        if (pc) await pc.setRemoteDescription(data.sdp);
      } else if (type === "rtc_ice") {
        const pc = pcRef.current;
        if (pc && data.candidate) {
          try {
            await pc.addIceCandidate(data.candidate);
          } catch {
            // ignore
          }
        }
      }
    },
    [createPeer, send],
  );

  useEffect(() => {
    if (!room) return;
    let closed = false;

    // Native audio session: loudspeaker + audio focus during the live lesson.
    const rtc = getRTC();
    if (rtc?.native) audioSession.start(true);

    (async () => {
      await initMedia();
      if (closed) return;
      const ws = new WebSocket(proRtcUrl(room));
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onclose = () => setConnected(false);
      ws.onmessage = (ev) => {
        try {
          handleSignal(JSON.parse(ev.data));
        } catch {
          // ignore
        }
      };
    })();

    return () => {
      closed = true;
      if (rtc?.native) audioSession.stop();
      try {
        wsRef.current?.close();
      } catch {
        // ignore
      }
      try {
        pcRef.current?.close();
      } catch {
        // ignore
      }
      localRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  const toggleTrack = useCallback((kind: "audio" | "video", on: boolean) => {
    const s = localRef.current;
    if (!s) return;
    s.getTracks()
      .filter((t) => t.kind === kind)
      .forEach((t) => (t.enabled = on));
  }, []);

  return {
    connected,
    messages,
    sendChat,
    localStream,
    remoteStream,
    peerPresent,
    mediaError,
    hasLocalVideo: !!localStream,
    toggleTrack,
  };
}
