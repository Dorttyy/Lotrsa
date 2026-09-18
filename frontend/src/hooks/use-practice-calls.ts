import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { useCall } from "@/src/context/CallContext";
import { api, User } from "@/src/utils/api";
import { webrtcAvailable } from "@/src/utils/webrtc";
import { CallFilters, filterQuery } from "@/src/components/call/filter-options";

export type PracticePartner = User & { practice_language: string };
type Match = { state: string; call_id?: string; partner?: User; expires_at?: number };

export function usePracticeCalls(language: string, filters: CallFilters) {
  const { user } = useAuth();
  const { startCall, busy } = useCall();
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const languageRef = useRef(language);
  languageRef.current = language;
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const [partners, setPartners] = useState<PracticePartner[]>([]);
  const [available, setAvailable] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const state = useRef({ available: false, searching: false, started: 0, live: false });
  const working = useRef(false);

  useEffect(() => {
    if (busy) { state.current.searching = false; setSearching(false); }
  }, [busy]);

  const stop = useCallback(async () => {
    state.current.searching = false;
    setSearching(false);
    try { await api.delete("/rtc/practice/queue"); }
    catch { setError("Could not cancel yet. Please check your connection."); }
  }, []);

  const list = useCallback(async () => {
    const requestedLanguage = languageRef.current;
    const requestedFilters = filterQuery(filtersRef.current);
    const res = await api.get<{ partners: PracticePartner[] }>(`/rtc/practice/partners?language=${requestedLanguage}${requestedFilters ? `&${requestedFilters}` : ""}`);
    if (state.current.live && requestedLanguage === languageRef.current && requestedFilters === filterQuery(filtersRef.current)) setPartners(res.partners);
  }, []);

  useEffect(() => {
    let active = true;
    const update = async () => {
      setLoading(true); setError("");
      try {
        if (state.current.available) await api.put("/rtc/practice/availability", { available: true, language, filters });
        await list();
      } catch (e: any) { if (active) setError(e.message); }
      finally { if (active) setLoading(false); }
    };
    if (user) void update();
    return () => { active = false; };
  }, [language, filters, list, user]);

  const match = useCallback(async () => {
    if (working.current || !state.current.searching) return;
    if (Date.now() - state.current.started > 120000) {
      await stop(); setError("No partner found yet. Try again or choose another language."); return;
    }
    working.current = true;
    try {
      const res = await api.post<Match>("/rtc/practice/queue");
      if (res.state === "matched" && res.call_id && res.partner) {
        if (!state.current.searching || !state.current.live) {
          await api.post(`/rtc/calls/${res.call_id}/status`, { status: "CANCELLED" });
          return;
        }
        state.current.searching = false;
        setSearching(false);
        await startCall(res.partner, res.call_id, res.expires_at);
      } else if (res.state === "incoming") {
        state.current.searching = false; setSearching(false);
      }
    } catch (e: any) { await stop(); setError(e.message); }
    finally { working.current = false; }
  }, [startCall, stop]);

  useFocusEffect(useCallback(() => {
    if (!user) return;
    state.current.live = true;
    const tick = async () => {
      if (!state.current.live || AppState.currentState === "background") return;
      try {
        if (state.current.available) await api.put("/rtc/practice/availability", { available: true, language: languageRef.current, filters: filtersRef.current });
        await list();
        if (!busyRef.current) await match();
      } catch (e: any) { if (state.current.live) setError(e.message); }
      finally { if (state.current.live) setLoading(false); }
    };
    void tick();
    const timer = setInterval(tick, 4000);
    const leave = () => {
      state.current.available = false; state.current.searching = false;
      setAvailable(false); setSearching(false);
      void api.put("/rtc/practice/availability", { available: false, language: languageRef.current }).catch(() => {});
    };
    const appState = AppState.addEventListener("change", (s) => { if (s !== "active") leave(); });
    return () => { state.current.live = false; clearInterval(timer); appState.remove(); leave(); };
  }, [user, list, match]));

  const toggle = async () => {
    if (pending) return;
    setError(""); setPending(true);
    const next = !state.current.available;
    try {
      await api.put("/rtc/practice/availability", { available: next, language, filters });
      state.current.available = next; setAvailable(next);
      if (!next) { state.current.searching = false; setSearching(false); }
    } catch (e: any) { setError(e.message); }
    finally { setPending(false); }
  };

  const search = () => {
    setError("");
    if (!webrtcAvailable()) { setError("Audio calls need an installed development build; Expo Go does not include WebRTC."); return; }
    if (!available || busy) return;
    state.current.started = Date.now(); state.current.searching = true;
    setSearching(true); void match();
  };

  const callPartner = async (partner: User) => {
    if (working.current || busy) return;
    setError("");
    if (!webrtcAvailable()) { setError("Audio calls need an installed development build; Expo Go does not include WebRTC."); return; }
    working.current = true; setPending(true);
    try {
      const res = await api.post<Match>("/rtc/practice/call", { receiver_id: partner.id });
      if (res.call_id) await startCall(partner, res.call_id, res.expires_at);
    } catch (e: any) { setError(e.message); }
    finally { working.current = false; setPending(false); }
  };
  return { partners, available, searching, loading, pending, error, busy, toggle, search, stop, callPartner };
}