import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import type { AudioSource } from "expo-audio";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { claimVoicePlayback, ownsVoicePlayback, releaseVoicePlayback } from "@/src/utils/voice-playback";

export function useExclusiveVoicePlayer(source: AudioSource | string | number | null, onStopped?: () => void) {
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);
  const owner = useRef(Symbol("voice-message")).current;
  const stoppedRef = useRef(onStopped);
  stoppedRef.current = onStopped;
  const live = useRef(true);
  const [error, setError] = useState("");
  const pending = useRef(false);

  const stop = useCallback(() => {
    releaseVoicePlayback(owner);
    pending.current = false;
    try { player.pause(); void player.seekTo(0).catch(() => {}); } catch { /* already released */ }
    if (live.current) stoppedRef.current?.();
  }, [owner, player]);

  useEffect(() => {
    live.current = true;
    player.loop = false;
    return () => { live.current = false; if (ownsVoicePlayback(owner)) stop(); };
  }, [player, owner, stop]);

  useFocusEffect(useCallback(() => {
    const sub = AppState.addEventListener("change", state => {
      if (state !== "active" && ownsVoicePlayback(owner)) stop();
    });
    return () => { sub.remove(); if (ownsVoicePlayback(owner)) stop(); };
  }, [owner, stop]));

  useEffect(() => {
    if (status.didJustFinish && ownsVoicePlayback(owner)) stop();
  }, [status.didJustFinish, owner, stop]);

  const toggle = useCallback(async () => {
    setError("");
    if (player.playing || (pending.current && ownsVoicePlayback(owner))) {
      releaseVoicePlayback(owner); pending.current = false; player.pause();
      return false;
    }
    const current = claimVoicePlayback(owner, stop);
    pending.current = true;
    try {
      player.loop = false;
      if (status.didJustFinish || (player.duration > 0 && player.currentTime >= player.duration - 0.05)) await player.seekTo(0);
      if (!current() || !live.current) return false;
      player.play();
      return true;
    } catch {
      if (current()) { releaseVoicePlayback(owner); if (live.current) setError("Could not play this voice message. Please try again."); }
      return false;
    } finally { pending.current = false; }
  }, [owner, player, status.didJustFinish, stop]);
  return { player, status, toggle, stop, error };
}