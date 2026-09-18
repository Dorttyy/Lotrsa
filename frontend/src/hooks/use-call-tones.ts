import { useAudioPlayer } from "expo-audio";
import { useCallback, useEffect, useRef } from "react";
import { Platform, Vibration } from "react-native";

interface RingingCall {
  callId: string;
  status: "outgoing" | "incoming" | "active";
  practice?: boolean;
}

/** Local playback only: never added to the microphone/WebRTC stream. */
export function useCallTones(call: RingingCall | null) {
  // Keep raw audio outside Metro's reserved /assets prefix. Bundled require()
  // remains offline-capable on native; contents are byte-identical originals.
  const ringtone = useAudioPlayer(require("../../media/sounds/ringtone.wav"));
  const outgoingTone = useAudioPlayer(require("../../media/sounds/outgoing-call.mp3"));
  const stopRef = useRef<() => void>(() => {});
  const stop = useCallback(() => stopRef.current(), []);

  useEffect(() => {
    if (call?.status !== "incoming" && call?.status !== "outgoing") return;
    const incoming = call.status === "incoming";
    // Practice retains its original soft ringback; only ordinary callers get
    // the user's uploaded MP3. Incoming ringtone/volume/vibration stay intact.
    const player = !incoming && !call.practice ? outgoingTone : ringtone;
    let cancelled = false;
    const stopThisTone = () => {
      cancelled = true;
      try { player.pause(); } catch { /* player already released */ }
      if (incoming && Platform.OS !== "web") Vibration.cancel();
    };
    stopRef.current = stopThisTone;

    const play = async () => {
      try {
        player.loop = true;
        player.volume = incoming ? 0.35 : 0.16;
        await player.seekTo(0);
        // Accept/end can arrive while the asset is rewinding/loading.
        if (!cancelled) player.play();
      } catch { /* Keep call controls usable if audio is unavailable. */ }
    };
    void play();
    if (incoming && Platform.OS !== "web") Vibration.vibrate([600, 1000], true);
    return () => {
      stopThisTone();
      if (stopRef.current === stopThisTone) stopRef.current = () => {};
    };
    // Calling -> Ringing must NOT restart the clip; a new call must start at 0.
  }, [call?.callId, call?.status, call?.practice, outgoingTone, ringtone]);

  return stop;
}