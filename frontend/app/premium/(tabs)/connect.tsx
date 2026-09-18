import { Ionicons } from "@/src/ui/icons";
import dayjs from "dayjs";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Avatar } from "@/src/components/Avatar";
import { FlagIcon } from "@/src/components/FlagIcon";
import { countryToCode } from "@/src/constants/countries";
import { langName, PROFICIENCY_LEVELS } from "@/src/constants/languages";
import { useAuth } from "@/src/context/AuthContext";
import { fonts } from "@/src/theme";
import { api, Conversation, User } from "@/src/utils/api";
import { premiumColors, premiumRadius } from "@/src/premium/theme";
import { SafeAreaView, useSafeAreaInsets } from "@/src/components/layout/SafeAreaView";
import { BoundedSheet } from "@/src/components/layout/BoundedSheet";

// Fixed popular languages shown as tabs. The 6 languages most Premium
// members will look for teachers in. Order matters — most-searched first.
const POPULAR_LANGS: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "zh", label: "Chinese" },
  { code: "ko", label: "Korean" },
  { code: "ja", label: "Japanese" },
  { code: "fr", label: "French" },
];

export default function PremiumConnect() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<string>(POPULAR_LANGS[0].code);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyBusy, setApplyBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Backend already filters by native_language OR teach_languages.
      const data = await api.get<User[]>(
        `/users/partners?language=${lang}`,
      );
      // Show every teacher of this language, VIP or not — any main-app user
      // can showcase themselves here by setting teach_languages.
      setMembers(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [lang, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const iTeach = useMemo(() => new Set(user?.teach_languages || []), [user]);

  // Start (or resume) a conversation with a member and open it inside the
  // Premium-themed chat (gold + royal purple) via the `premium=1` flag.
  const openChat = async (memberId: string) => {
    try {
      const conv = await api.post<Conversation>("/chats", {
        partner_id: memberId,
      });
      router.push(`/chat/${conv.id}?premium=1`);
    } catch (e) {
      Alert.alert(
        "Message",
        e instanceof Error ? e.message : "Could not start the chat.",
      );
    }
  };

  const toggleTeach = async (code: string) => {
    if (!user || applyBusy) return;
    const next = new Set(iTeach);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setApplyBusy(true);
    try {
      const updated = await api.put<User>("/users/me", {
        teach_languages: Array.from(next),
      });
      setUser(updated);
    } catch {
      Alert.alert("Save failed", "Please try again.");
    } finally {
      setApplyBusy(false);
    }
  };

  const ProfDots = ({ level }: { level?: string | null }) => {
    const idx = level ? PROFICIENCY_LEVELS.indexOf(level) : -1;
    const filled = idx >= 0 ? idx + 1 : 1;
    return (
      <View style={styles.dotsRow}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[styles.dot, i < filled && styles.dotFilled]}
          />
        ))}
      </View>
    );
  };

  const renderCard = ({ item }: { item: User }) => {
    const learning = (
      item.learning_languages?.length
        ? item.learning_languages
        : item.learning_language
          ? [item.learning_language]
          : []
    ).slice(0, 3);

    const isNew =
      item.created_at &&
      dayjs().diff(dayjs(item.created_at), "day") < 7;
    const isNative = item.native_language === lang;

    return (
      <Pressable
        testID={`premium-partner-${item.id}`}
        style={styles.card}
        onPress={() => router.push(`/user/${item.id}`)}
      >
        <View style={styles.avatarCol}>
          <Avatar
            name={item.name}
            url={item.avatar_url}
            size={54}
            flagCode={countryToCode(item.country)}
            online={item.is_online}
            frame={item.active_frame}
          />
          <View style={styles.activeRow}>
            <View
              style={[
                styles.activeDot,
                {
                  backgroundColor: item.is_online
                    ? premiumColors.success
                    : premiumColors.onSurfaceTertiary,
                },
              ]}
            />
            <Text style={styles.activeText} numberOfLines={1}>
              {item.is_online ? "Active" : "Recently"}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.is_vip && (
              <View style={styles.vipBadge}>
                <Ionicons
                  name="diamond"
                  size={9}
                  color={premiumColors.onGold}
                />
                <Text style={styles.vipText}>VIP</Text>
              </View>
            )}
            {isNative && (
              <View style={styles.nativeBadge}>
                <Text style={styles.nativeText}>NATIVE</Text>
              </View>
            )}
            {isNew && !isNative && (
              <View style={styles.newBadge}>
                <Text style={styles.newText}>NEW</Text>
              </View>
            )}
          </View>

          <View style={styles.langRow}>
            <View style={styles.langItem}>
              <Text style={styles.langCode}>
                {(item.native_language || "").toUpperCase()}
              </Text>
              <View style={styles.langFlowBar} />
            </View>
            <Ionicons
              name="swap-horizontal"
              size={13}
              color={premiumColors.onSurfaceSecondary}
              style={{ marginHorizontal: 5 }}
            />
            {learning.map((c, i) => (
              <View key={c} style={[styles.langItem, { marginRight: 6 }]}>
                <Text style={styles.langCode}>{c.toUpperCase()}</Text>
                <ProfDots
                  level={
                    item.proficiencies?.[c] ||
                    (i === 0 ? item.proficiency : null)
                  }
                />
              </View>
            ))}
          </View>

          <Text style={styles.cardSub} numberOfLines={2}>
            {item.bio?.trim() ||
              `Teaches ${langName(lang)} — send a message to say hi.`}
          </Text>
        </View>

        <Pressable
          testID={`premium-partner-chat-${item.id}`}
          hitSlop={8}
          onPress={(e) => {
            e.stopPropagation();
            openChat(item.id);
          }}
          style={styles.waveBtn}
        >
          <Ionicons
            name="chatbubble"
            size={20}
            color={premiumColors.onGold}
          />
        </Pressable>
      </Pressable>
    );
  };

  const currentLangLabel =
    POPULAR_LANGS.find((l) => l.code === lang)?.label || langName(lang);

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top"]}
      testID="premium-connect-screen"
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>PREMIUM CLUB</Text>
          <Text style={styles.title}>Language Teachers</Text>
        </View>
        <Pressable
          testID="premium-connect-apply"
          onPress={() => setApplyOpen(true)}
          style={styles.applyBtn}
          hitSlop={6}
        >
          <Ionicons name="school" size={14} color={premiumColors.onGold} />
          <Text style={styles.applyText}>Teach here</Text>
        </Pressable>
      </View>

      {/* Language tabs — underline style with generous spacing, matches
          main app's language filter. This whole block stays FIXED on screen
          — only the FlatList of profiles below scrolls. */}
      <View style={styles.langBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.langBarRow}
        >
          {POPULAR_LANGS.map((t) => {
            const active = lang === t.code;
            return (
              <Pressable
                key={t.code}
                testID={`premium-lang-tab-${t.code}`}
                onPress={() => setLang(t.code)}
                style={styles.langTabItem}
              >
                <View style={styles.langTabInner}>
                  <FlagIcon code={t.code} size={22} />
                  <Text
                    style={[
                      styles.langTabText,
                      active && styles.langTabTextActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </View>
                <View
                  style={[
                    styles.langTabBar,
                    active && styles.langTabBarActive,
                  ]}
                />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.countStrip}>
        <Ionicons name="diamond" size={11} color={premiumColors.gold} />
        <Text style={styles.countStripText}>
          {loading ? "Loading…" : `${members.length} ${currentLangLabel} teachers`}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={premiumColors.gold} />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m) => m.id}
          renderItem={renderCard}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyBadge}>
                <FlagIcon code={lang} size={48} />
              </View>
              <Text style={styles.emptyTitle}>No {currentLangLabel} teachers yet</Text>
              <Text style={styles.emptyBody}>
                Be the first to teach {currentLangLabel} in the Premium Club.
              </Text>
              <Pressable
                testID="premium-empty-apply"
                onPress={() => setApplyOpen(true)}
                style={styles.emptyBtn}
              >
                <Text style={styles.emptyBtnText}>Apply as teacher</Text>
              </Pressable>
            </View>
          }
        />
      )}

      {/* Apply as Teacher modal */}
      <Modal
        visible={applyOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setApplyOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setApplyOpen(false)}>
          <BoundedSheet testID="premium-teach-sheet" style={[styles.modalSheet, { paddingBottom: 30 + insets.bottom }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Teach on Premium</Text>
            <Text style={styles.modalBody}>
              Pick the languages you can teach. Your profile will appear under
              each language tab so learners can find and chat with you.
            </Text>
            <View style={styles.chipGrid}>
              {POPULAR_LANGS.map((l) => {
                const on = iTeach.has(l.code);
                return (
                  <Pressable
                    key={l.code}
                    testID={`premium-apply-lang-${l.code}`}
                    disabled={applyBusy}
                    onPress={() => toggleTeach(l.code)}
                    style={[styles.langChip, on && styles.langChipOn]}
                  >
                    <FlagIcon code={l.code} size={20} />
                    <Text
                      style={[
                        styles.langChipText,
                        on && { color: premiumColors.onGold },
                      ]}
                    >
                      {l.label}
                    </Text>
                    {on && (
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color={premiumColors.onGold}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              testID="premium-apply-done"
              onPress={() => setApplyOpen(false)}
              style={styles.modalDone}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </Pressable>
          </BoundedSheet>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: premiumColors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
  },
  brand: {
    fontFamily: fonts.textBold,
    fontSize: 10,
    letterSpacing: 2,
    color: premiumColors.gold,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: premiumColors.onSurface,
    marginTop: 2,
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: premiumColors.gold,
    borderRadius: premiumRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  applyText: {
    fontFamily: fonts.textBold,
    fontSize: 12,
    color: premiumColors.onGold,
  },
  langBar: {
    backgroundColor: premiumColors.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: premiumColors.divider,
  },
  langBarRow: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 26, // generous spacing between tabs
    alignItems: "flex-start",
  },
  langTabItem: {
    alignItems: "center",
    paddingBottom: 0,
    minWidth: 64,
  },
  langTabInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  langTabText: {
    fontFamily: fonts.textBold,
    fontSize: 14,
    color: premiumColors.onSurfaceSecondary,
  },
  langTabTextActive: {
    color: premiumColors.gold,
    fontFamily: fonts.displayBold,
  },
  langTabBar: {
    height: 3,
    width: "100%",
    backgroundColor: "transparent",
    borderRadius: 2,
  },
  langTabBarActive: {
    backgroundColor: premiumColors.gold,
  },
  countStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 12,
  },
  countStripText: {
    fontFamily: fonts.textBold,
    fontSize: 11,
    color: premiumColors.onSurfaceSecondary,
    letterSpacing: 0.5,
  },
  list: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  sep: { height: 12 },
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: premiumRadius.xl,
    backgroundColor: premiumColors.surfaceRaised,
    borderWidth: 1,
    borderColor: premiumColors.border,
    position: "relative",
  },
  avatarCol: { alignItems: "center", width: 62, gap: 6 },
  activeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  activeText: {
    fontFamily: fonts.textSemi,
    fontSize: 10,
    color: premiumColors.onSurfaceSecondary,
  },
  cardBody: { flex: 1, gap: 5 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  cardName: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: premiumColors.onSurface,
    flexShrink: 1,
  },
  vipBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: premiumColors.gold,
    borderRadius: premiumRadius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  vipText: {
    fontFamily: fonts.textBold,
    fontSize: 8,
    color: premiumColors.onGold,
    letterSpacing: 0.5,
  },
  nativeBadge: {
    backgroundColor: premiumColors.success + "33",
    borderRadius: premiumRadius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  nativeText: {
    fontFamily: fonts.textBold,
    fontSize: 8,
    color: premiumColors.success,
    letterSpacing: 0.5,
  },
  newBadge: {
    backgroundColor: premiumColors.info + "33",
    borderRadius: premiumRadius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  newText: {
    fontFamily: fonts.textBold,
    fontSize: 8,
    color: premiumColors.info,
    letterSpacing: 0.5,
  },
  langRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  langItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  langCode: {
    fontFamily: fonts.textBold,
    fontSize: 11,
    color: premiumColors.gold,
    letterSpacing: 0.8,
  },
  langFlowBar: {
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: premiumColors.gold,
  },
  dotsRow: { flexDirection: "row", gap: 2 },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: premiumColors.border,
  },
  dotFilled: { backgroundColor: premiumColors.gold },
  cardSub: {
    fontFamily: fonts.text,
    fontSize: 12,
    color: premiumColors.onSurfaceSecondary,
    lineHeight: 17,
  },
  waveBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: premiumColors.gold,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyBox: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 40,
    gap: 8,
  },
  emptyBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: premiumColors.surfaceRaised,
    borderWidth: 2,
    borderColor: premiumColors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: premiumColors.onSurface,
    marginTop: 10,
  },
  emptyBody: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: premiumColors.onSurfaceSecondary,
    textAlign: "center",
    lineHeight: 19,
  },
  emptyBtn: {
    marginTop: 14,
    backgroundColor: premiumColors.gold,
    borderRadius: premiumRadius.pill,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  emptyBtnText: {
    fontFamily: fonts.textBold,
    fontSize: 14,
    color: premiumColors.onGold,
  },
  // Apply modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: premiumColors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 30,
    borderWidth: 1,
    borderColor: premiumColors.gold + "44",
    borderBottomWidth: 0,
  },
  modalHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: premiumColors.border,
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: premiumColors.onSurface,
    marginBottom: 6,
  },
  modalBody: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: premiumColors.onSurfaceSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  langChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: premiumColors.surfaceRaised,
    borderRadius: premiumRadius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: premiumColors.border,
  },
  langChipOn: {
    backgroundColor: premiumColors.gold,
    borderColor: premiumColors.gold,
  },
  langChipText: {
    fontFamily: fonts.textBold,
    fontSize: 13,
    color: premiumColors.onSurface,
  },
  modalDone: {
    marginTop: 20,
    backgroundColor: premiumColors.gold,
    borderRadius: premiumRadius.pill,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalDoneText: {
    fontFamily: fonts.textBold,
    fontSize: 15,
    color: premiumColors.onGold,
  },
});
