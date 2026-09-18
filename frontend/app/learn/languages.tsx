import { Ionicons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { useAuth } from "@/src/context/AuthContext";
import { fonts } from "@/src/theme";
import { api, User } from "@/src/utils/api";
import { learnColors } from "@/src/learn/theme";
import { FlagIcon } from "@/src/components/FlagIcon";

// Curated language pool matching the reference screenshot (with recognisable
// national flags rendered via emoji so we ship no image assets).
const LANGS = [
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "en", name: "English", flag: "🇺🇸" },
];

/**
 * My Language — pick the target language for the whole Learn experience.
 * Reference layout: at the top a compact "USA ↔ Spanish" pair chip showing
 * the user's native ↔ target flags, then a long scrollable list of options,
 * with the current pick highlighted in orange.
 */
export default function LearnLanguages() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const currentTarget = user?.learning_language || "es";
  const nativeLang = user?.native_language || "en";
  const currentTargetInfo =
    LANGS.find((l) => l.code === currentTarget) || LANGS[2];
  const nativeInfo = LANGS.find((l) => l.code === nativeLang) || LANGS[9];

  const pick = async (code: string) => {
    if (busy || code === currentTarget) return;
    setBusy(code);
    try {
      const updated = await api.put<User>("/users/me", {
        learning_language: code,
        learning_languages: [code],
      });
      setUser(updated);
    } catch {}
    setBusy(null);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          testID="learn-languages-back"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.h1}>My Language</Text>
        <View style={styles.searchChip}>
          <Ionicons name="search" size={17} color="#FFF" />
        </View>
      </View>

      {/* Current pair */}
      <View style={styles.pairRow}>
        <View style={styles.pairChip}>
          <FlagIcon code={nativeInfo.code} size={26} />
          <Text style={styles.pairLabel}>USA</Text>
        </View>
        <View style={styles.swapChip}>
          <Ionicons name="swap-horizontal" size={16} color="#FFF" />
        </View>
        <View style={styles.pairChip}>
          <FlagIcon code={currentTargetInfo.code} size={26} />
          <Text style={styles.pairLabel}>{currentTargetInfo.name}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>My Language</Text>

      <ScrollView contentContainerStyle={styles.list}>
        {LANGS.map((l) => {
          const selected = l.code === currentTarget;
          return (
            <Pressable
              key={l.code}
              testID={`learn-language-${l.code}`}
              onPress={() => pick(l.code)}
              style={[styles.row, selected && styles.rowSelected]}
            >
              <View style={styles.flagCircle}>
                <FlagIcon code={l.code} size={28} />
              </View>
              <Text
                style={[styles.name, selected && { color: "#FFFFFF" }]}
              >
                {l.name}
              </Text>
              {selected && <View style={styles.selectedDot} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: learnColors.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
  },
  h1: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },
  searchChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: learnColors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  pairRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  pairChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pairFlag: { fontSize: 20 },
  pairLabel: {
    fontFamily: fonts.textBold,
    fontSize: 13,
    color: "#FFFFFF",
  },
  swapChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: learnColors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 4,
  },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  rowSelected: {
    borderColor: learnColors.orange,
    backgroundColor: "rgba(255,92,31,0.14)",
  },
  flagCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: learnColors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  flag: { fontSize: 22 },
  name: {
    flex: 1,
    fontFamily: fonts.textBold,
    fontSize: 15,
    color: learnColors.onSurfaceSecondary,
  },
  selectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: learnColors.orange,
    marginRight: 8,
  },
});
