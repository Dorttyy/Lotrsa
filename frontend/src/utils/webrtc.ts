import { PermissionsAndroid, Platform } from "react-native";

import { api } from "@/src/utils/api";

/**
 * WebRTC environment helpers shared by 1-to-1 calls and voice rooms.
 *
 * ICE servers come from the backend (`GET /api/rtc/config`) so TURN
 * credentials live in server env vars, never in the client bundle. A public
 * STUN-only fallback keeps calls working if that request fails.
 */

export const FALLBACK_ICE = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

/** Voice-optimised capture: echo cancellation, noise suppression, AGC. */
export const AUDIO_CONSTRAINTS = {
  video: false,
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
  },
};

let iceCache: { at: number; config: any } | null = null;
let icePending: Promise<any> | null = null;
const ICE_TTL_MS = 10 * 60 * 1000;

export const getIceConfig = async (): Promise<any> => {
  if (iceCache && Date.now() - iceCache.at < ICE_TTL_MS) return iceCache.config;
  if (icePending) return icePending;
  icePending = fetchIceConfig();
  try { return await icePending; }
  finally { icePending = null; }
};

const fetchIceConfig = async (): Promise<any> => {
  try {
    const res = await api.get<{ iceServers: any[] }>("/rtc/config");
    const config = {
      iceServers: res.iceServers?.length ? res.iceServers : FALLBACK_ICE.iceServers,
      iceCandidatePoolSize: 2,
    };
    iceCache = { at: Date.now(), config };
    return config;
  } catch {
    return FALLBACK_ICE;
  }
};

/** Cached ICE config for synchronous call sites (primed by `getIceConfig`). */
export const iceConfigSync = (): any => iceCache?.config ?? FALLBACK_ICE;

// Native WebRTC (react-native-webrtc) — available in production/dev builds,
// gracefully absent in Expo Go.
let NativeWebRTC: any = null;
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    NativeWebRTC = require("react-native-webrtc");
  } catch {
    NativeWebRTC = null;
  }
}

export interface RTCEnv {
  PC: any;
  mediaDevices: any;
  native: boolean;
}

export const getRTC = (): RTCEnv | null => {
  if (Platform.OS === "web") {
    if (
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices &&
      typeof (window as any).RTCPeerConnection === "function"
    ) {
      return {
        PC: (window as any).RTCPeerConnection,
        mediaDevices: navigator.mediaDevices,
        native: false,
      };
    }
    return null;
  }
  if (NativeWebRTC?.RTCPeerConnection && NativeWebRTC?.mediaDevices) {
    return {
      PC: NativeWebRTC.RTCPeerConnection,
      mediaDevices: NativeWebRTC.mediaDevices,
      native: true,
    };
  }
  return null;
};

export const webrtcAvailable = () => !!getRTC();

/** Human-readable message for a getUserMedia failure. */
export const micErrorMessage = (err: any): string => {
  const name = err?.name || "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Microphone permission is required to make an audio call. Please allow microphone access and try again.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "No microphone was found on this device.";
  if (name === "NotReadableError" || name === "AbortError")
    return "Your microphone is already in use by another app. Close it and try again.";
  return "Could not start the microphone. Please check your audio device and try again.";
};

/**
 * Ensure the OS-level microphone permission is granted before capture.
 *
 * - Web: getUserMedia shows the browser prompt itself, so this is a no-op.
 * - Android: RECORD_AUDIO is a runtime permission. Even though it's declared in
 *   the manifest, `getUserMedia` fails silently/with NotAllowedError unless the
 *   user has granted it at runtime, so we request it explicitly here.
 * - iOS: react-native-webrtc's getUserMedia triggers the system prompt (backed
 *   by NSMicrophoneUsageDescription); nothing extra to do.
 *
 * Throws a NotAllowedError-shaped error when the user denies, so existing
 * `alertMicError` handling shows the "open settings" flow.
 */
export const ensureMicPermission = async (): Promise<void> => {
  if (Platform.OS !== "android") return;
  try {
    const already = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );
    if (already) return;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: "Microphone access",
        message:
          "Allow microphone access so you can talk in calls and voice rooms.",
        buttonPositive: "Allow",
        buttonNegative: "Not now",
      },
    );
    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      const err: any = new Error("Microphone permission denied");
      err.name = "NotAllowedError";
      throw err;
    }
  } catch (err: any) {
    if (err?.name === "NotAllowedError") throw err;
    // PermissionsAndroid unavailable (e.g. Expo Go quirk) — let getUserMedia
    // handle the prompt / failure itself.
  }
};

/** Capture the mic with voice-optimised constraints (falls back to plain audio). */
export const getMicStream = async (): Promise<any> => {
  const rtc = getRTC();
  if (!rtc) throw new Error("webrtc-unavailable");
  // Request the runtime mic permission up front (Android) so capture never
  // comes up silent because the OS never asked the user.
  await ensureMicPermission();
  try {
    return await rtc.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
  } catch (err: any) {
    if (err?.name === "OverconstrainedError" || err?.name === "TypeError") {
      return rtc.mediaDevices.getUserMedia({ audio: true, video: false });
    }
    throw err;
  }
};

/** Prefer the Opus codec for audio transceivers where the API exists. */
export const preferOpus = (pc: any) => {
  try {
    const RTCRtpReceiver =
      Platform.OS === "web"
        ? (window as any).RTCRtpReceiver
        : NativeWebRTC?.RTCRtpReceiver;
    const caps = RTCRtpReceiver?.getCapabilities?.("audio");
    if (!caps?.codecs) return;
    const opus = caps.codecs.filter((c: any) =>
      /opus/i.test(c.mimeType || ""),
    );
    if (!opus.length) return;
    const others = caps.codecs.filter((c: any) => !/opus/i.test(c.mimeType || ""));
    pc.getTransceivers?.().forEach((t: any) => {
      if (t.receiver?.track?.kind === "audio" || t.sender?.track?.kind === "audio") {
        t.setCodecPreferences?.([...opus, ...others]);
      }
    });
  } catch {
    // setCodecPreferences unsupported — Opus is the default anyway.
  }
};

export interface RtcQuality {
  rtt: number | null;
  jitter: number | null;
  packetsLost: number | null;
  bitrate: number | null;
  inboundLevel: number;
  outboundLevel: number;
}

/**
 * Snapshot of the connection's health plus audio levels. Used for reconnection
 * decisions and (on native, where Web Audio is unavailable) speaker detection.
 */
export const readStats = async (pc: any): Promise<RtcQuality> => {
  const out: RtcQuality = {
    rtt: null,
    jitter: null,
    packetsLost: null,
    bitrate: null,
    inboundLevel: 0,
    outboundLevel: 0,
  };
  try {
    const report = await pc.getStats();
    const each = (cb: (r: any) => void) => {
      if (typeof report.forEach === "function") report.forEach(cb);
      else Object.values(report || {}).forEach(cb as any);
    };
    each((r: any) => {
      if (!r) return;
      if (r.type === "inbound-rtp" && (r.kind === "audio" || r.mediaType === "audio")) {
        if (typeof r.audioLevel === "number")
          out.inboundLevel = Math.max(out.inboundLevel, r.audioLevel);
        if (typeof r.jitter === "number") out.jitter = r.jitter;
        if (typeof r.packetsLost === "number") out.packetsLost = r.packetsLost;
        if (typeof r.bytesReceived === "number") out.bitrate = r.bytesReceived;
      } else if (r.type === "media-source" && r.kind === "audio") {
        if (typeof r.audioLevel === "number") out.outboundLevel = r.audioLevel;
      } else if (r.type === "candidate-pair" && (r.nominated || r.selected)) {
        if (typeof r.currentRoundTripTime === "number")
          out.rtt = r.currentRoundTripTime;
      }
    });
  } catch {
    // stats unavailable on this platform
  }
  return out;
};
