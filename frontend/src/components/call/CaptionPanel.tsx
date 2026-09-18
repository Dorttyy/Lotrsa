import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { langName } from "@/src/constants/languages";
import { api, assetUrl, getAuthToken } from "@/src/utils/api";
import { fonts, ThemeColors } from "@/src/theme";
import CaptionCapture from "./CaptionCapture";

interface Caption { id: string; text: string; original: string; speaker_id: string; target_language: string }
type Status = { consented: boolean; active: boolean; available: boolean; target_language: string };

export function CaptionPanel({ callId, stream, muted, connected, subscribe }: {
  callId: string; stream: any; muted: boolean; connected: boolean;
  subscribe: (fn: (e: any) => void) => () => void;
}) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const s = styles(colors);
  const [status, setStatus] = useState<Status | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [foreground, setForeground] = useState(true);
  const controller = useRef<AbortController | null>(null);
  const uploadBusy = useRef(false);
  const live = useRef(true);
  const allowed = !!status?.active && !!status.consented && !muted && connected && foreground;
  const allowedRef = useRef(allowed);
  allowedRef.current = allowed;

  const refresh = useCallback(async () => {
    try { const data = await api.get<Status>(`/rtc/calls/${callId}/captions`); if (live.current) setStatus(data); }
    catch (e: any) { if (live.current) setError(e.message); }
  }, [callId]);
  useEffect(() => {
    live.current = true;
    void refresh(); const timer = setInterval(refresh, 3000);
    const unsub = subscribe(event => {
      if (event.call_id !== callId) return;
      if (event.type === "caption_consent") { if (!event.active) allowedRef.current = false; void refresh(); }
      if (event.type === "call_caption" && event.target_language === user?.native_language) {
        setCaptions(prev => prev.some(c => c.id === event.id) ? prev : [...prev.slice(-19), event]);
      }
    });
    const appState = AppState.addEventListener("change", next => setForeground(next === "active"));
    return () => { live.current = false; allowedRef.current = false; clearInterval(timer); unsub(); appState.remove(); controller.current?.abort(); };
  }, [callId, refresh, subscribe, user?.native_language]);

  useEffect(() => { if (!allowed) controller.current?.abort(); }, [allowed]);

  const revoke = useCallback((message: string) => {
    allowedRef.current = false; setError(message);
    setStatus(prev => prev ? { ...prev, active: false, consented: false } : prev);
    void api.put(`/rtc/calls/${callId}/captions`, { enabled: false }).catch(() => {});
  }, [callId]);

  const onChunk = useCallback(async (pcm: ArrayBuffer) => {
    if (!allowedRef.current || uploadBusy.current) return; // bounded, skip stale audio
    uploadBusy.current = true; setProcessing(true);
    const abort = new AbortController(); controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 30000);
    try {
      const res = await fetch(assetUrl(`/api/rtc/calls/${callId}/audio`)!, { method: "POST",
        headers: { Authorization: `Bearer ${getAuthToken()}`, "Content-Type": "application/octet-stream" }, body: pcm, signal: abort.signal });
      if (!res.ok) { const data = await res.json(); throw new Error(data.detail || "Caption segment could not be processed."); }
      if (live.current) setError("");
    } catch (e: any) { if (live.current && allowedRef.current && e.name !== "AbortError") setError(e.message); }
    finally { clearTimeout(timeout); uploadBusy.current = false; if (live.current) setProcessing(false); }
  }, [callId]);

  const toggle = async () => {
    if (pending || !status) return;
    const next = !status.consented;
    if (!next) { allowedRef.current = false; controller.current?.abort(); setStatus({ ...status, consented: false, active: false }); setCaptions([]); }
    setPending(true); setError("");
    try { await api.put(`/rtc/calls/${callId}/captions`, { enabled: next }); await refresh(); }
    catch (e: any) { setError(e.message); }
    finally { setPending(false); }
  };
  return <View testID="call-captions-panel" style={s.panel}>
    <View style={s.row}><Text testID="call-caption-language" style={s.title}>Captions · {langName(user?.native_language)}</Text>
      <Pressable testID="call-caption-consent-btn" onPress={toggle} disabled={pending || !status?.available} style={s.button}><Text style={s.link}>{pending ? "Please wait…" : status?.consented ? "Turn off" : "Enable"}</Text></Pressable></View>
    <Text testID="call-caption-status" style={s.info}>{!status ? "Checking local captions…" : !status.available ? "Local caption models are unavailable for your language. Audio calls still work." : !status.consented ? "Enable to share short mic segments with our server. Both people must agree. Audio and text are not saved." : !status.active ? "Waiting for your partner’s caption consent…" : muted ? "Microphone muted · your captions paused" : !connected ? "Captions paused while reconnecting" : processing ? "Transcribing and translating…" : "Listening · captions appear in your native language"}</Text>
    {!!error && <Text testID="call-caption-error" style={s.error}>{error}</Text>}
    {captions.length > 0 && <ScrollView testID="call-native-translated-box" style={s.transcript} nestedScrollEnabled>
      {captions.map(c => <View key={c.id} style={s.segment}><Text testID={`caption-speaker-${c.id}`} style={s.info}>{c.speaker_id === user?.id ? "You" : "Partner"}</Text><Text testID={`caption-text-${c.id}`} style={s.text}>{c.text}</Text></View>)}
    </ScrollView>}
    {allowed && <CaptionCapture stream={stream} onChunk={onChunk} onError={revoke} />}
  </View>;
}
const styles = (c: ThemeColors) => StyleSheet.create({
  panel: { width: "100%", borderRadius: 18, padding: 14, backgroundColor: c.surface, gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 }, title: { flex: 1, fontSize: 14, color: c.onSurface, fontFamily: fonts.textBold },
  button: { minHeight: 44, paddingHorizontal: 8, justifyContent: "center" }, link: { fontSize: 14, color: c.brand, fontFamily: fonts.textBold },
  info: { fontSize: 12, lineHeight: 18, color: c.onSurfaceSecondary, fontFamily: fonts.text }, text: { fontSize: 16, lineHeight: 24, color: c.onSurface },
  transcript: { maxHeight: 140 }, segment: { paddingVertical: 8 }, error: { fontSize: 12, lineHeight: 18, color: c.error },
});