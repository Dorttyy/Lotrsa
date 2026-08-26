import { useEffect, useRef } from "react";

import { RoomMember } from "@/src/utils/api";
import {
  LevelMeter,
  SPEAKING_HOLD_MS,
  SPEAKING_THRESHOLD_STATS,
  SPEAKING_THRESHOLD_WEB,
  createLevelMeter,
} from "@/src/utils/audio-level";
import { audioSession } from "@/src/utils/incall";
import { alertMicError } from "@/src/utils/mic-error";
import {
  getIceConfig,
  getMicStream,
  getRTC,
  preferOpus,
  readStats,
  webrtcAvailable,
} from "@/src/utils/webrtc";

interface RoomAudioParams {
  roomId: string;
  myId: string;
  members: RoomMember[];
  sendSignal: (data: Record<string, unknown>) => void;
  subscribe: (fn: (event: any) => void) => () => void;
  /** Real active-speaker feed (ids currently producing audio). */
  onSpeakingChange?: (ids: string[]) => void;
  /** Per-participant transport state (reconnecting/connected/disconnected). */
  onPeerStateChange?: (states: Record<string, string>) => void;
}

const LEVEL_POLL_MS = 300;
const RECONNECT_DELAY_MS = 2000;

/**
 * Full-mesh WebRTC audio for a voice room (web + native builds).
 *
 * Speakers publish their mic (Opus, echo cancellation + noise suppression +
 * AGC); everyone receives. Deterministic initiator (greater id offers) avoids
 * glare, ICE candidates are buffered per-peer until the remote description is
 * set, dropped transports are recovered with an ICE restart, and real audio
 * levels drive active-speaker state.
 */
export function useRoomAudio({
  roomId,
  myId,
  members,
  sendSignal,
  subscribe,
  onSpeakingChange,
  onPeerStateChange,
}: RoomAudioParams) {
  const peersRef = useRef<Map<string, any>>(new Map());
  const audioElsRef = useRef<Map<string, any>>(new Map());
  const metersRef = useRef<Map<string, LevelMeter>>(new Map());
  const lastSpokeRef = useRef<Map<string, number>>(new Map());
  const speakingRef = useRef<string>("");
  const peerStatesRef = useRef<Record<string, string>>({});
  const reconnectTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const pendingIceRef = useRef<Map<string, any[]>>(new Map());
  const localStreamRef = useRef<any>(null);
  const localMeterRef = useRef<LevelMeter | null>(null);
  const me = members.find((m) => m.id === myId);
  const iSpeak = !!me && (me.role === "host" || me.role === "speaker");
  const micOn = !!me?.mic_on;
  const micOnRef = useRef(micOn);
  const iSpeakRef = useRef(iSpeak);
  micOnRef.current = micOn;

  // Keep local track enabled state in sync with mic_on (never tear the
  // PeerConnection down just because the user muted).
  useEffect(() => {
    localStreamRef.current?.getAudioTracks?.().forEach((t: any) => {
      t.enabled = micOn;
    });
  }, [micOn]);

  // Rebuild mesh when my speaking capability changes. Peers I initiate to
  // (smaller ids) are re-created by the membership effect below; peers that
  // initiate to ME (bigger ids) don't know my connection changed, so we ask
  // them to restart their side via an "rtc_restart" signal.
  useEffect(() => {
    if (!webrtcAvailable()) return;
    if (iSpeakRef.current !== iSpeak) {
      iSpeakRef.current = iSpeak;
      // Demoted to listener → release the mic entirely.
      if (!iSpeak) {
        localMeterRef.current?.stop();
        localMeterRef.current = null;
        localStreamRef.current?.getTracks?.().forEach((t: any) => t.stop());
        localStreamRef.current = null;
      }
      closeAllPeers();
      members
        .filter((m) => m.id !== myId && m.id > myId)
        .forEach((m) => {
          sendSignal({ type: "rtc_restart", to: m.id, room_id: roomId });
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iSpeak]);

  const setPeerState = (peerId: string, state: string) => {
    if (peerStatesRef.current[peerId] === state) return;
    peerStatesRef.current = { ...peerStatesRef.current, [peerId]: state };
    onPeerStateChange?.(peerStatesRef.current);
  };

  const closePeer = (peerId: string) => {
    const timer = reconnectTimersRef.current.get(peerId);
    if (timer) {
      clearTimeout(timer);
      reconnectTimersRef.current.delete(peerId);
    }
    const pc = peersRef.current.get(peerId);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.oniceconnectionstatechange = null;
      pc.close?.();
    }
    peersRef.current.delete(peerId);
    pendingIceRef.current.delete(peerId);
    metersRef.current.get(peerId)?.stop();
    metersRef.current.delete(peerId);
    lastSpokeRef.current.delete(peerId);
    const el = audioElsRef.current.get(peerId);
    if (el && typeof el === "object" && "srcObject" in el) {
      el.srcObject = null;
    }
    audioElsRef.current.delete(peerId);
  };

  const closeAllPeers = () => {
    for (const id of Array.from(peersRef.current.keys())) closePeer(id);
  };

  const ensureLocalStream = async () => {
    if (!iSpeakRef.current) return null;
    if (!localStreamRef.current) {
      try {
        // Own the native audio session before opening the mic (iOS needs the
        // session configured first, otherwise capture can come up silent).
        if (getRTC()?.native) audioSession.start(true);
        const stream = await getMicStream();
        localStreamRef.current = stream;
        stream.getAudioTracks().forEach((t: any) => {
          t.enabled = micOnRef.current;
        });
        localMeterRef.current = createLevelMeter(stream);
      } catch (err) {
        // Don't dead-end the user: explain why they can't talk (and how to fix
        // it) while they stay in the room as a listener.
        alertMicError(err, "Can't turn on your mic");
        return null;
      }
    }
    return localStreamRef.current;
  };

  const flushIce = async (peerId: string) => {
    const pc = peersRef.current.get(peerId);
    if (!pc || !pc.remoteDescription) return;
    const queued = pendingIceRef.current.get(peerId) || [];
    pendingIceRef.current.set(peerId, []);
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // stale candidate; ignore
      }
    }
  };

  const initiateTo = async (peerId: string, iceRestart = false) => {
    try {
      const pc = iceRestart
        ? peersRef.current.get(peerId)
        : await createPeer(peerId);
      if (!pc) return;
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        ...(iceRestart ? { iceRestart: true } : {}),
      });
      await pc.setLocalDescription(offer);
      sendSignal({ type: "rtc_offer", to: peerId, room_id: roomId, sdp: offer });
    } catch {
      closePeer(peerId);
    }
  };

  /** Recover a dropped transport: ICE restart first, full rebuild on failure. */
  const scheduleRecovery = (peerId: string, hard: boolean) => {
    if (reconnectTimersRef.current.has(peerId)) return;
    const timer = setTimeout(async () => {
      reconnectTimersRef.current.delete(peerId);
      const pc = peersRef.current.get(peerId);
      const amInitiator = myId > peerId;
      if (!pc) return;
      const state = pc.connectionState || pc.iceConnectionState;
      if (state === "connected" || state === "completed") {
        setPeerState(peerId, "CONNECTED");
        return;
      }
      if (!amInitiator) {
        // The other side drives renegotiation; ask it to restart if hard-failed.
        if (hard) sendSignal({ type: "rtc_restart", to: peerId, room_id: roomId });
        return;
      }
      if (hard) {
        closePeer(peerId);
        await initiateTo(peerId);
      } else {
        await initiateTo(peerId, true);
      }
    }, RECONNECT_DELAY_MS);
    reconnectTimersRef.current.set(peerId, timer);
  };

  const createPeer = async (peerId: string) => {
    const rtc = getRTC();
    if (!rtc) throw new Error("webrtc-unavailable");
    const config = await getIceConfig();
    const pc = new rtc.PC(config);
    peersRef.current.set(peerId, pc);
    setPeerState(peerId, "JOINING");
    const stream = await ensureLocalStream();
    if (stream) {
      stream.getTracks().forEach((t: any) => pc.addTrack(t, stream));
    } else {
      // Listener: explicitly request a receive-only audio m-line so the offer
      // always contains audio (offerToReceiveAudio alone is unreliable on
      // native unified-plan builds).
      try {
        pc.addTransceiver?.("audio", { direction: "recvonly" });
      } catch {
        // older implementation — legacy offerToReceiveAudio still applies
      }
    }
    preferOpus(pc);
    pc.onicecandidate = (e: any) => {
      if (e.candidate) {
        sendSignal({
          type: "rtc_ice",
          to: peerId,
          room_id: roomId,
          candidate: e.candidate,
        });
      }
    };
    const onState = () => {
      const state = pc.connectionState || pc.iceConnectionState;
      if (state === "connected" || state === "completed") {
        setPeerState(peerId, "CONNECTED");
      } else if (state === "disconnected") {
        setPeerState(peerId, "RECONNECTING");
        scheduleRecovery(peerId, false);
      } else if (state === "failed") {
        setPeerState(peerId, "RECONNECTING");
        scheduleRecovery(peerId, true);
      } else if (state === "closed") {
        setPeerState(peerId, "DISCONNECTED");
      }
    };
    pc.onconnectionstatechange = onState;
    pc.oniceconnectionstatechange = onState;
    pc.ontrack = (e: any) => {
      const remoteStream = e.streams?.[0] || null;
      if (rtc.native) {
        // react-native-webrtc plays remote audio tracks automatically.
        audioElsRef.current.set(peerId, remoteStream);
      } else {
        const audio = document.createElement("audio");
        audio.autoplay = true;
        audio.srcObject = remoteStream;
        audioElsRef.current.set(peerId, audio);
        const meter = createLevelMeter(remoteStream);
        if (meter) {
          metersRef.current.get(peerId)?.stop();
          metersRef.current.set(peerId, meter);
        }
      }
    };
    return pc;
  };

  // Connect/disconnect peers as membership changes
  useEffect(() => {
    if (!webrtcAvailable() || !me) return;
    const otherIds = new Set(
      members.filter((m) => m.id !== myId).map((m) => m.id),
    );
    // close departed
    for (const id of Array.from(peersRef.current.keys())) {
      if (!otherIds.has(id)) closePeer(id);
    }
    // initiate to new peers when I'm the designated initiator
    otherIds.forEach(async (peerId) => {
      if (peersRef.current.has(peerId)) return;
      if (myId > peerId) {
        await initiateTo(peerId);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, myId, me?.role]);

  // Handle signaling
  useEffect(() => {
    if (!webrtcAvailable()) return;
    const unsub = subscribe(async (event: any) => {
      if (event.room_id !== roomId) return;
      const from = event.from;
      try {
        if (event.type === "rtc_offer") {
          const existing = peersRef.current.get(from);
          // An offer on a live connection is a renegotiation / ICE restart —
          // answer it in place instead of tearing the transport down.
          if (existing && existing.remoteDescription) {
            await existing.setRemoteDescription(event.sdp);
            const answer = await existing.createAnswer();
            await existing.setLocalDescription(answer);
            await flushIce(from);
            sendSignal({
              type: "rtc_answer",
              to: from,
              room_id: roomId,
              sdp: answer,
            });
            return;
          }
          closePeer(from);
          const pc = await createPeer(from);
          await pc.setRemoteDescription(event.sdp);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await flushIce(from);
          sendSignal({
            type: "rtc_answer",
            to: from,
            room_id: roomId,
            sdp: answer,
          });
        } else if (event.type === "rtc_answer") {
          await peersRef.current.get(from)?.setRemoteDescription(event.sdp);
          await flushIce(from);
        } else if (event.type === "rtc_ice") {
          if (event.candidate) {
            const queue = pendingIceRef.current.get(from) || [];
            queue.push(event.candidate);
            pendingIceRef.current.set(from, queue);
            await flushIce(from);
          }
        } else if (event.type === "rtc_restart") {
          // Peer's media setup changed (e.g. promoted to speaker) — tear down
          // and re-offer if I'm the designated initiator for this pair.
          closePeer(from);
          if (myId > from) await initiateTo(from);
        }
      } catch {
        // signaling race; peer will retry on next membership change
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, subscribe]);

  // Real active-speaker detection from actual audio levels.
  useEffect(() => {
    if (!onSpeakingChange) return;
    const rtc = getRTC();
    const useStats = !!rtc?.native;
    const iv = setInterval(async () => {
      const now = Date.now();
      // Local mic
      if (micOnRef.current && localStreamRef.current) {
        if (useStats) {
          const anyPc = peersRef.current.values().next().value;
          if (anyPc) {
            const s = await readStats(anyPc);
            if (s.outboundLevel > SPEAKING_THRESHOLD_STATS)
              lastSpokeRef.current.set(myId, now);
          }
        } else {
          const level = localMeterRef.current?.level() ?? 0;
          if (level > SPEAKING_THRESHOLD_WEB) lastSpokeRef.current.set(myId, now);
        }
      }
      // Remote peers
      for (const [peerId, pc] of Array.from(peersRef.current.entries())) {
        if (useStats) {
          const s = await readStats(pc);
          if (s.inboundLevel > SPEAKING_THRESHOLD_STATS)
            lastSpokeRef.current.set(peerId, now);
        } else {
          const level = metersRef.current.get(peerId)?.level() ?? 0;
          if (level > SPEAKING_THRESHOLD_WEB) lastSpokeRef.current.set(peerId, now);
        }
      }
      const ids: string[] = [];
      lastSpokeRef.current.forEach((at, id) => {
        if (now - at < SPEAKING_HOLD_MS) ids.push(id);
      });
      ids.sort();
      const key = ids.join(",");
      if (key !== speakingRef.current) {
        speakingRef.current = key;
        onSpeakingChange(ids);
      }
    }, LEVEL_POLL_MS);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSpeakingChange, myId]);

  // Native audio session: route voice-room audio to the loudspeaker for the
  // whole life of the room session (no-op on web / Expo Go).
  useEffect(() => {
    const rtc = getRTC();
    if (!rtc?.native) return;
    audioSession.start(true);
    return () => audioSession.stop();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    const lastSpoke = lastSpokeRef.current;
    return () => {
      closeAllPeers();
      localMeterRef.current?.stop();
      localMeterRef.current = null;
      localStreamRef.current?.getTracks?.().forEach((t: any) => t.stop());
      localStreamRef.current = null;
      lastSpoke.clear();
      onSpeakingChange?.([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { audioActive: webrtcAvailable() };
}
