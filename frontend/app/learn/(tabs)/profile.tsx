import { VIcon } from "@/src/learn/Icon";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/context/AuthContext";
import { vocabApi, VocabBooking, VocabStats, SupportedVocabLanguage } from "@/src/learn/api";
import { useLearnTheme } from "@/src/learn/ThemeContext";
import { LearnPalette, learnRadius } from "@/src/learn/theme";

type IonIcon = string;
type Stat = { label: string; value: string; icon: IonIcon };

export default function VocabProfile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors, mode, toggle } = useLearnTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [stats, setStats] = useState<VocabStats | null>(null);
  const [bookings, setBookings] = useState<VocabBooking[]>([]);
  const [bookmarks, setBookmarks] = useState<{ tutors: any[]; words: any[]; lessons: any[] }>({ tutors: [], words: [], lessons: [] });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [st, bk, bm] = await Promise.all([
        vocabApi.myStats(),
        vocabApi.myBookings().catch(() => []),
        vocabApi.myBookmarks().catch(() => ({ tutors: [], words: [], lessons: [] })),
      ]);
      setStats(st);
      setBookings(bk);
      setBookmarks(bm);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const statCards: Stat[] = [
    { label: "Words learned", value: String(stats?.words_learned ?? 0), icon: "reader-outline" },
    { label: "Lessons", value: String(stats?.lessons_completed ?? 0), icon: "school-outline" },
    { label: "Streak", value: String(stats?.streak ?? 0), icon: "flame-outline" },
    { label: "XP", value: String(stats?.xp ?? 0), icon: "star-outline" },
  ];

  const upcoming = bookings.filter((b) => new Date(b.slot_iso) > new Date()).slice(0, 3);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingLeft: insets.left, paddingRight: insets.right }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40, paddingHorizontal: 18 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cardPurple} />}
      >
        <View style={s.headerRow}>
          <View style={s.avatarWrap}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, { backgroundColor: "#D8CBFF", alignItems: "center", justifyContent: "center" }]}>
                <Text style={{ fontSize: 32, fontWeight: "800", color: "#4B3F82" }}>{user?.name?.[0] ?? "?"}</Text>
              </View>
            )}
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={s.name}>{user?.name || "Learner"}</Text>
            <Text style={s.email}>{user?.email || ""}</Text>
          </View>
          <Pressable style={s.settingsBtn} onPress={toggle} hitSlop={8}>
            <VIcon name={mode === "dark" ? "sunny" : "moon"} size={20} color={colors.text} />
          </Pressable>
        </View>

        <View style={s.progressCard}>
          <View style={s.tagPill}>
            <Text style={s.tagPillText}>Level {stats?.level ?? 1}</Text>
          </View>
          <Text style={s.progressTitle}>You’re doing great!</Text>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${Math.max(4, Math.min(100, (stats?.progress ?? 0) * 100))}%` }]} />
          </View>
          <Text style={s.progressCaption}>{stats?.xp_to_next ?? 100} XP to next level</Text>
        </View>

        <Text style={s.section}>Stats</Text>
        <View style={s.statsGrid}>
          {statCards.map((st) => (
            <View key={st.label} style={s.statCard}>
              <View style={s.statIconWrap}>
                <VIcon name={st.icon} size={20} color="#0B0B0F" />
              </View>
              <Text style={s.statValue}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        <Text style={s.section}>Upcoming lessons</Text>
        <View style={s.settingsList}>
          {upcoming.length === 0 ? (
            <View style={{ padding: 14 }}>
              <Text style={{ color: colors.textDim, fontSize: 13 }}>No upcoming lessons. Book one from the Tutors tab.</Text>
            </View>
          ) : (
            upcoming.map((b) => (
              <View key={b.id} style={s.bookingRow}>
                <View style={s.bookingAvatar}>
                  {b.tutor_avatar_url ? (
                    <Image source={{ uri: b.tutor_avatar_url }} style={{ width: 34, height: 34, borderRadius: 17 }} />
                  ) : (
                    <Text style={{ fontWeight: "800", color: "#4B3F82" }}>{(b.tutor_name || "?")[0]}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.bookingTutor}>{b.tutor_name || "Tutor"}</Text>
                  <Text style={s.bookingWhen}>{new Date(b.slot_iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</Text>
                </View>
                <Pressable
                  onPress={async () => {
                    try { await vocabApi.cancelBooking(b.id); setBookings((bs) => bs.filter((x) => x.id !== b.id)); } catch {}
                  }}
                  style={s.cancelBtn}
                  hitSlop={6}
                >
                  <VIcon name="close" size={16} color={colors.text} />
                </Pressable>
              </View>
            ))
          )}
        </View>

        <Text style={s.section}>Saved tutors</Text>
        <View style={s.settingsList}>
          {bookmarks.tutors.length === 0 ? (
            <View style={{ padding: 14 }}>
              <Text style={{ color: colors.textDim, fontSize: 13 }}>Bookmark tutors from the Tutors tab to find them later.</Text>
            </View>
          ) : (
            bookmarks.tutors.map((b) => (
              <Pressable
                key={b.target_id}
                onPress={() => router.push({ pathname: "/learn/tutor/[id]", params: { id: b.target_id } })}
                style={s.settingsRow}
              >
                <VIcon name="bookmark" size={18} color={colors.cardPurple} />
                <Text style={s.settingsLabel} numberOfLines={1}>Tutor {String(b.target_id).slice(0, 8)}</Text>
                <VIcon name="chevron-forward" size={18} color={colors.textDim} style={{ marginLeft: "auto" }} />
              </Pressable>
            ))
          )}
        </View>

        <Text style={s.section}>Appearance</Text>
        <View style={s.settingsList}>
          <Pressable style={s.settingsRow} onPress={toggle}>
            <VIcon name={mode === "dark" ? "moon" : "sunny"} size={20} color={colors.text} />
            <Text style={s.settingsLabel}>Theme</Text>
            <View style={s.modePillWrap}>
              <View style={[s.modePill, mode === "light" && s.modePillActive]}>
                <Text style={[s.modePillText, mode === "light" && s.modePillTextActive]}>Light</Text>
              </View>
              <View style={[s.modePill, mode === "dark" && s.modePillActive]}>
                <Text style={[s.modePillText, mode === "dark" && s.modePillTextActive]}>Dark</Text>
              </View>
            </View>
          </Pressable>
        </View>

        <Text style={s.section}>Settings</Text>
        <View style={s.settingsList}>
          {[
            { icon: "notifications-outline", label: "Notifications" },
            { icon: "language-outline", label: "Language preferences" },
            { icon: "card-outline", label: "Subscription" },
            { icon: "help-circle-outline", label: "Help & support" },
          ].map((row) => (
            <Pressable key={row.label} style={s.settingsRow}>
              <VIcon name={row.icon as any} size={20} color={colors.text} />
              <Text style={s.settingsLabel}>{row.label}</Text>
              <VIcon name="chevron-forward" size={18} color={colors.textDim} style={{ marginLeft: "auto" }} />
            </Pressable>
          ))}
        </View>

        <Pressable style={({ pressed }) => [s.logoutBtn, pressed && { opacity: 0.85 }]} onPress={() => logout()}>
          <Text style={s.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: LearnPalette) =>
  StyleSheet.create({
    headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 22 },
    avatarWrap: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: c.cardPurple, overflow: "hidden" },
    avatar: { width: "100%", height: "100%" },
    name: { color: c.text, fontSize: 20, fontWeight: "800" },
    email: { color: c.textDim, fontSize: 13, marginTop: 2 },
    settingsBtn: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceRaised,
      alignItems: "center", justifyContent: "center",
      borderWidth: c.mode === "light" ? 1 : 0, borderColor: c.border,
    },
    progressCard: {
      backgroundColor: c.cardPurple, borderRadius: learnRadius.lg, padding: 18, marginBottom: 22,
    },
    tagPill: {
      alignSelf: "flex-start", backgroundColor: "#F2F2F4", borderRadius: learnRadius.chip,
      paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12,
    },
    tagPillText: { color: c.onLight, fontSize: 12, fontWeight: "600" },
    progressTitle: { color: c.onLight, fontSize: 22, fontWeight: "800", marginBottom: 14 },
    progressTrack: { height: 6, borderRadius: 3, backgroundColor: "#F2F2F4", overflow: "hidden" },
    progressFill: { height: "100%", backgroundColor: c.onLight, borderRadius: 3 },
    progressCaption: { color: c.onLight, fontSize: 12, fontWeight: "600", marginTop: 8 },
    section: { color: c.text, fontSize: 20, fontWeight: "800", marginBottom: 14 },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 22 },
    statCard: { width: "48%", backgroundColor: c.cardMint, borderRadius: 22, padding: 14, marginBottom: 12 },
    statIconWrap: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.55)",
      alignItems: "center", justifyContent: "center", marginBottom: 12,
    },
    statValue: { color: c.onLight, fontSize: 22, fontWeight: "800" },
    statLabel: { color: "#2A2A34", fontSize: 12, fontWeight: "600", marginTop: 2 },
    settingsList: {
      backgroundColor: c.surfaceRaised, borderRadius: 22, paddingHorizontal: 6, paddingVertical: 4,
      marginBottom: 22, borderWidth: c.mode === "light" ? 1 : 0, borderColor: c.border,
    },
    settingsRow: {
      flexDirection: "row", alignItems: "center", gap: 14,
      paddingHorizontal: 12, paddingVertical: 14,
    },
    settingsLabel: { color: c.text, fontSize: 15, fontWeight: "600", flex: 1 },
    bookingRow: {
      flexDirection: "row", alignItems: "center", gap: 12,
      paddingHorizontal: 12, paddingVertical: 12,
    },
    bookingAvatar: {
      width: 34, height: 34, borderRadius: 17, backgroundColor: "#D8CBFF",
      alignItems: "center", justifyContent: "center", overflow: "hidden",
    },
    bookingTutor: { color: c.text, fontSize: 14, fontWeight: "800" },
    bookingWhen: { color: c.textDim, fontSize: 12, marginTop: 2 },
    cancelBtn: {
      width: 28, height: 28, borderRadius: 14, backgroundColor: c.surface,
      alignItems: "center", justifyContent: "center",
    },
    modePillWrap: {
      marginLeft: "auto", flexDirection: "row",
      backgroundColor: c.mode === "dark" ? "#0B0B0F" : "#EDEDF1",
      borderRadius: 999, padding: 3, gap: 2,
    },
    modePill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
    modePillActive: { backgroundColor: c.cardPurple },
    modePillText: { fontSize: 12, fontWeight: "700", color: c.mode === "dark" ? "#9A9AA5" : "#5A5A63" },
    modePillTextActive: { color: "#0B0B0F" },
    logoutBtn: {
      backgroundColor: c.surfaceRaised, borderRadius: learnRadius.chip, paddingVertical: 14,
      alignItems: "center", borderWidth: c.mode === "light" ? 1 : 0, borderColor: c.border,
    },
    logoutText: { color: "#F0715C", fontSize: 15, fontWeight: "700" },
  });
