import { Ionicons } from "@/src/ui/icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { Avatar } from "@/src/components/Avatar";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/utils/api";
import { proColors, proFonts, proRadius, proShadow } from "@/src/pro/theme";

interface ProAccount {
  id: string;
  role: "student" | "tutor";
  name: string;
  bio: string;
  avatar_url?: string;
  lessons_taught: number;
  rating: number;
}

export default function ProProfile() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProAccount | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const me = await api.get<{ profile: ProAccount; wallet: { balance: number } }>("/pro/me");
      setProfile(me.profile);
      setBalance(me.wallet.balance);
    } catch {
      // silent
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const switchRole = async (role: "student" | "tutor") => {
    if (busy || profile?.role === role) return;
    setBusy(true);
    try {
      const p = await api.post<ProAccount>("/pro/role", { role });
      setProfile(p);
    } catch {
      // silent
    } finally {
      setBusy(false);
    }
  };

  const isTutor = profile?.role === "tutor";

  return (
    <SafeAreaView style={styles.screen} edges={["top"]} testID="pro-profile-screen">
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>PRO · ACCOUNT</Text>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Identity card */}
        <View style={styles.card}>
          <Avatar name={user?.name} url={user?.avatar_url} size={68} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.name || "Learner"}</Text>
            <View style={styles.roleBadge}>
              <Ionicons
                name={isTutor ? "school" : "person"}
                size={12}
                color={proColors.onAccent}
              />
              <Text style={styles.roleBadgeText}>{isTutor ? "Tutor" : "Student"}</Text>
            </View>
          </View>
        </View>

        {/* Role switch */}
        <Text style={styles.section}>I want to</Text>
        <View style={styles.roleSwitch}>
          <Pressable
            testID="pro-role-student"
            onPress={() => switchRole("student")}
            style={[styles.roleOpt, !isTutor && styles.roleOptActive]}
          >
            <Ionicons name="book" size={20} color={!isTutor ? proColors.onAccent : proColors.inkSoft} />
            <Text style={[styles.roleOptText, !isTutor && styles.roleOptTextActive]}>Learn</Text>
          </Pressable>
          <Pressable
            testID="pro-role-tutor"
            onPress={() => switchRole("tutor")}
            style={[styles.roleOpt, isTutor && styles.roleOptActive]}
          >
            <Ionicons name="school" size={20} color={isTutor ? proColors.onAccent : proColors.inkSoft} />
            <Text style={[styles.roleOptText, isTutor && styles.roleOptTextActive]}>Teach</Text>
          </Pressable>
        </View>

        {isTutor && (
          <Pressable
            testID="pro-open-availability"
            style={styles.availRow}
            onPress={() => router.push("/pro/availability")}
          >
            <View style={styles.availIcon}>
              <Ionicons name="calendar" size={18} color={proColors.sage} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.availTitle}>Manage availability</Text>
              <Text style={styles.availSub}>Set your open teaching blocks</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={proColors.inkFaint} />
          </Pressable>
        )}

        {/* Wallet + menu */}
        <View style={styles.walletCard}>
          <View>
            <Text style={styles.walletLabel}>Lesson balance</Text>
            <Text style={styles.walletValue}>{balance ?? "—"} min</Text>
          </View>
          <Pressable style={styles.topupBtn}>
            <Text style={styles.topupText}>Top up</Text>
          </Pressable>
        </View>

        <View style={styles.menu}>
          {[
            { icon: "time-outline", label: "Lesson history" },
            { icon: "card-outline", label: "Payments" },
            { icon: "notifications-outline", label: "Notifications" },
            { icon: "help-circle-outline", label: "Help & support" },
          ].map((m, i) => (
            <Pressable key={m.label} style={[styles.menuRow, i > 0 && styles.menuBorder]}>
              <Ionicons name={m.icon as any} size={20} color={proColors.inkSoft} />
              <Text style={styles.menuText}>{m.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={proColors.inkFaint} />
            </Pressable>
          ))}
        </View>

        <Pressable
          testID="pro-exit-btn"
          style={styles.exitBtn}
          onPress={() => router.replace("/(tabs)/chats")}
        >
          <Ionicons name="exit-outline" size={18} color={proColors.terracotta} />
          <Text style={styles.exitText}>Back to main app</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: proColors.bg },
  body: { paddingBottom: 40 },
  header: { paddingHorizontal: 22, paddingTop: 8 },
  kicker: { fontFamily: proFonts.sansSemi, fontSize: 11, letterSpacing: 2, color: proColors.terracotta },
  title: { fontFamily: proFonts.serifBold, fontSize: 28, color: proColors.ink, marginTop: 2 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: proColors.surface,
    borderRadius: proRadius.xl,
    marginHorizontal: 22,
    marginTop: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: proColors.border,
    ...proShadow.card,
  },
  name: { fontFamily: proFonts.serifBold, fontSize: 22, color: proColors.ink },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: proColors.sage,
    borderRadius: proRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 6,
  },
  roleBadgeText: { fontFamily: proFonts.sansBold, fontSize: 11, color: proColors.onAccent },
  section: { fontFamily: proFonts.serifBold, fontSize: 18, color: proColors.ink, paddingHorizontal: 22, marginTop: 22, marginBottom: 10 },
  roleSwitch: { flexDirection: "row", gap: 12, paddingHorizontal: 22 },
  roleOpt: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: proColors.surface,
    borderRadius: proRadius.lg,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: proColors.border,
  },
  roleOptActive: { backgroundColor: proColors.terracotta, borderColor: proColors.terracotta },
  roleOptText: { fontFamily: proFonts.sansBold, fontSize: 15, color: proColors.inkSoft },
  roleOptTextActive: { color: proColors.onAccent },
  availRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: proColors.surface,
    borderRadius: proRadius.lg,
    marginHorizontal: 22,
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: proColors.border,
    ...proShadow.soft,
  },
  availIcon: {
    width: 40,
    height: 40,
    borderRadius: proRadius.md,
    backgroundColor: proColors.sageTint,
    alignItems: "center",
    justifyContent: "center",
  },
  availTitle: { fontFamily: proFonts.sansBold, fontSize: 15, color: proColors.ink },
  availSub: { fontFamily: proFonts.sans, fontSize: 12, color: proColors.inkSoft, marginTop: 2 },
  walletCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: proColors.ink,
    borderRadius: proRadius.xl,
    marginHorizontal: 22,
    marginTop: 18,
    padding: 18,
  },
  walletLabel: { fontFamily: proFonts.sans, fontSize: 12.5, color: "rgba(255,255,255,0.7)" },
  walletValue: { fontFamily: proFonts.serifBold, fontSize: 26, color: "#FFFFFF", marginTop: 2 },
  topupBtn: { backgroundColor: proColors.terracotta, borderRadius: proRadius.md, paddingHorizontal: 18, paddingVertical: 11 },
  topupText: { fontFamily: proFonts.sansBold, fontSize: 14, color: proColors.onAccent },
  menu: {
    backgroundColor: proColors.surface,
    borderRadius: proRadius.xl,
    marginHorizontal: 22,
    marginTop: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: proColors.border,
    ...proShadow.soft,
  },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16 },
  menuBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: proColors.divider },
  menuText: { flex: 1, fontFamily: proFonts.sansSemi, fontSize: 15, color: proColors.ink },
  exitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 22,
    marginHorizontal: 22,
    paddingVertical: 14,
    borderRadius: proRadius.md,
    borderWidth: 1.5,
    borderColor: proColors.terracottaSoft,
  },
  exitText: { fontFamily: proFonts.sansBold, fontSize: 14, color: proColors.terracotta },
});
