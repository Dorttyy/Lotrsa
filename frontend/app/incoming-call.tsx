import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCall } from "@/src/context/CallContext";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, ThemeColors } from "@/src/theme";

export default function IncomingCallScreen() {
  const { call_id } = useLocalSearchParams<{ call_id?: string }>();
  const { recoverIncoming } = useCall();
  const { user } = useAuth();
  const router = useRouter();
  const { colors } = useTheme(); const s = styles(colors);
  const [pending,setPending] = useState(true);
  useEffect(() => {
    if (!user) { setPending(false); return; }
    let live = true;
    void recoverIncoming(call_id).then(found => {
      if (!live) return;
      if (found) router.replace("/(tabs)/chats");
      else setPending(false);
    });
    return () => { live = false; };
  }, [call_id, user?.id, recoverIncoming, router]);
  return <SafeAreaView testID="incoming-call-recovery" style={s.root}><View style={s.content}>
    {pending ? <><ActivityIndicator color={colors.brand} /><Text testID="incoming-call-recovering" style={s.text}>Opening your call…</Text></> : <><Text testID="incoming-call-expired" style={s.title}>{user ? "This call is no longer available" : "Sign in to answer calls"}</Text><Text style={s.text}>Calls expire after 45 seconds if unanswered. No expired call will be opened.</Text><Pressable testID="incoming-call-back" style={s.button} onPress={() => router.replace(user ? "/(tabs)/chats" : "/auth?mode=login")}><Text style={s.buttonText}>{user ? "Back to chats" : "Sign in"}</Text></Pressable></>}
  </View></SafeAreaView>;
}
const styles = (c: ThemeColors) => StyleSheet.create({ root: { flex: 1, backgroundColor: c.surface }, content: { flex: 1, justifyContent: "center", padding: 24, gap: 20 }, title: { fontFamily: fonts.displaySemi, fontSize: 25, lineHeight: 32, color: c.onSurface, textAlign: "center" }, text: { fontFamily: fonts.text, fontSize: 14, lineHeight: 21, color: c.onSurfaceSecondary, textAlign: "center" }, button: { minHeight: 52, backgroundColor: c.brand, borderRadius: 26, alignItems: "center", justifyContent: "center" }, buttonText: { color: c.onBrand, fontFamily: fonts.textBold, fontSize: 15 } });