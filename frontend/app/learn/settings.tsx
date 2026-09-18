import { Ionicons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";
import { AppSwitch } from "@/src/components/AppSwitch";

import { fonts } from "@/src/theme";
import { learnColors } from "@/src/learn/theme";

export default function LearnSettings() {
  const router = useRouter();
  const [dailyReminder, setDailyReminder] = useState(true);
  const [soundFx, setSoundFx] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [strictMode, setStrictMode] = useState(false);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          testID="settings-back"
          onPress={() => router.back()}
          style={styles.iconChip}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color="#FFF" />
        </Pressable>
        <Text style={styles.h1}>Learn Settings</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Learning */}
        <Text style={styles.section}>Learning</Text>
        <NavRow
          icon="language"
          label="My Language"
          hint="Change your target language"
          onPress={() => router.push("/learn/languages")}
        />
        <NavRow
          icon="flag"
          label="Weekly goal"
          hint="7 activities · 15 min/day"
          onPress={() => router.push("/learn/set-goal")}
        />
        <NavRow
          icon="school"
          label="Level assessment"
          hint="Retake to update your level"
          onPress={() => router.push("/learn/assessment")}
        />

        {/* Practice */}
        <Text style={styles.section}>Practice preferences</Text>
        <ToggleRow
          icon="volume-high"
          label="Auto-speak new words"
          hint="Pronounce each word when it appears"
          value={autoSpeak}
          onChange={setAutoSpeak}
        />
        <ToggleRow
          icon="musical-notes"
          label="Sound effects"
          hint="Correct / wrong feedback chimes"
          value={soundFx}
          onChange={setSoundFx}
        />
        <ToggleRow
          icon="shield-checkmark"
          label="Strict grading"
          hint="Require accents & punctuation"
          value={strictMode}
          onChange={setStrictMode}
        />

        {/* Reminders */}
        <Text style={styles.section}>Reminders</Text>
        <ToggleRow
          icon="notifications"
          label="Daily practice reminder"
          hint="7:30 PM every evening"
          value={dailyReminder}
          onChange={setDailyReminder}
        />

        {/* Account */}
        <Text style={styles.section}>Account</Text>
        <NavRow
          icon="card"
          label="Subscription"
          hint="Free · upgrade for more content"
          onPress={() => router.push("/learn/subscription")}
        />
        <NavRow
          icon="trophy"
          label="Achievements"
          hint="View your badges"
          onPress={() => router.push("/learn/achievements")}
        />
        <NavRow
          icon="bar-chart"
          label="Progress statistics"
          hint="XP, streaks & milestones"
          onPress={() => router.push("/learn/stats")}
        />

        {/* About */}
        <Text style={styles.section}>About</Text>
        <NavRow icon="help-circle" label="Help & Feedback" hint="Contact support" />
        <NavRow icon="document-text" label="Terms & Privacy" />

        <Text style={styles.version}>Learn v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const NavRow = ({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  onPress?: () => void;
}) => (
  <Pressable onPress={onPress} style={styles.row} testID={`settings-${label}`}>
    <View style={styles.rowIcon}>
      <Ionicons name={icon} size={16} color="#FFF" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.rowLabel}>{label}</Text>
      {hint && <Text style={styles.rowHint}>{hint}</Text>}
    </View>
    {onPress && <Ionicons name="chevron-forward" size={16} color="#6B6B75" />}
  </Pressable>
);

const ToggleRow = ({
  icon,
  label,
  hint,
  value,
  onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) => (
  <View style={styles.row}>
    <View style={styles.rowIcon}>
      <Ionicons name={icon} size={16} color="#FFF" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowHint}>{hint}</Text>
    </View>
    <AppSwitch
      value={value}
      onValueChange={onChange}
      trackColor={{ true: learnColors.orange, false: learnColors.surfaceHigh }}
      thumbColor="#FFFFFF"
    />
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: learnColors.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 6,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: learnColors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  h1: { fontFamily: fonts.displayBold, fontSize: 18, color: "#FFF" },
  body: { padding: 20, gap: 8 },
  section: {
    fontFamily: fonts.displayBold,
    fontSize: 13,
    color: learnColors.onSurfaceSecondary,
    marginTop: 14,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: learnColors.surface,
    borderRadius: 16,
    padding: 14,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: learnColors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { fontFamily: fonts.textBold, fontSize: 14, color: "#FFF" },
  rowHint: {
    fontFamily: fonts.textSemi,
    fontSize: 12,
    color: learnColors.onSurfaceSecondary,
    marginTop: 2,
  },
  version: {
    fontFamily: fonts.textSemi,
    fontSize: 11,
    color: learnColors.onSurfaceTertiary,
    textAlign: "center",
    marginTop: 20,
  },
});
