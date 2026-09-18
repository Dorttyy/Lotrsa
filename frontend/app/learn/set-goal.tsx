import { Ionicons, MaterialCommunityIcons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { fonts } from "@/src/theme";
import { learnColors } from "@/src/learn/theme";
import { SafeAreaView, useSafeAreaInsets } from "@/src/components/layout/SafeAreaView";
import { useSheetBounds } from "@/src/hooks/use-screen-space";

/**
 * "Set your Spanish goal" — a compact 4-step form matching the reference:
 *   1. Level (Basic / Independent / Proficient)     [modal picker]
 *   2. Time frame (1-3 / 3-6 / 6-12 months)         [modal picker]
 *   3. Reason (Brain / School / Exam / Fun / Travel)[modal picker]
 *   4. Weekly activity target + minutes-per-day
 * Each row is a rounded pill (dark bg). Selected values swap the pill fill
 * to the accent orange, matching "active icon changes colour" requirement.
 */

const LEVELS = [
  {
    key: "basic",
    label: "Basic",
    body: "Use common expressions for introductions, personal details, and hobbies.",
  },
  {
    key: "independent",
    label: "Independent",
    body: "Grasp the main points in daily communication and confidently express your opinions.",
  },
  {
    key: "proficient",
    label: "Proficient",
    body: "Communicate clearly in various settings, understanding indirect meaning.",
  },
];
const TIMES = [
  { key: "1-3", label: "1–3 months" },
  { key: "3-6", label: "3–6 months" },
  { key: "6-12", label: "6–12 months" },
  { key: "12+", label: "Over a year" },
];
const REASONS = [
  { key: "brain", label: "Brain training or for fun" },
  { key: "school", label: "School or an exam" },
  { key: "travel", label: "Travel" },
  { key: "work", label: "Work" },
  { key: "culture", label: "Connect with culture" },
];
const ACTIVITIES = [3, 5, 7, 10, 14];
const MINUTES = ["5 minutes/day", "10 minutes/day", "15 minutes/day", "30 minutes/day", "45 minutes/day"];

export default function LearnSetGoal() {
  const router = useRouter();
  const [level, setLevel] = useState<string | null>("basic");
  const [time, setTime] = useState<string | null>("1-3");
  const [reason, setReason] = useState<string | null>("brain");
  const [weekly, setWeekly] = useState<number>(7);
  const [minutes, setMinutes] = useState<string>("15 minutes/day");
  const [sheet, setSheet] = useState<null | "level" | "time" | "reason" | "weekly" | "minutes">(null);
  const styles = useMemo(() => makeStyles(), []);

  const levelLabel = LEVELS.find((l) => l.key === level)?.label || "Set level";
  const timeLabel = TIMES.find((t) => t.key === time)?.label || "Choose time frame";
  const reasonLabel = REASONS.find((r) => r.key === reason)?.label || "Why do you want to learn?";

  const openSheet = (k: NonNullable<typeof sheet>) => setSheet(k);
  const closeSheet = () => setSheet(null);

  const submit = () => {
    // In a real product this would POST to /api/learn/goal — for now we save
    // in-memory then return to the plan page.
    router.push("/learn/subscription");
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <View style={styles.backChip}>
          <Pressable testID="learn-goal-back" onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#FFF" />
          </Pressable>
        </View>
        <Text style={styles.h1}>Set goal</Text>
        <Pressable
          testID="learn-goal-close"
          onPress={() => router.replace("/learn/dashboard")}
          style={styles.closeChip}
          hitSlop={8}
        >
          <Ionicons name="close" size={20} color="#FFF" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Your Spanish goal</Text>

        <SelectorRow
          testID="learn-goal-level"
          selected={!!level}
          value={levelLabel}
          icon={<MaterialCommunityIcons name="arrow-up-bold" size={16} color="#FFF" />}
          onPress={() => openSheet("level")}
        />
        <SelectorRow
          testID="learn-goal-time"
          value={timeLabel}
          icon={<Ionicons name="time-outline" size={16} color="#B0B0BD" />}
          onPress={() => openSheet("time")}
        />
        <SelectorRow
          testID="learn-goal-reason"
          value={reasonLabel}
          icon={<Ionicons name="school-outline" size={16} color="#B0B0BD" />}
          onPress={() => openSheet("reason")}
        />

        {/* Purple activities card */}
        <View style={styles.purpleCard}>
          <View style={styles.purpleTop}>
            <Text style={styles.purpleTitle}>{weekly} Activities per week</Text>
            <Pressable
              testID="learn-goal-weekly"
              onPress={() => openSheet("weekly")}
              style={styles.infoChip}
            >
              <Ionicons name="information" size={14} color="#0B0B0F" />
            </Pressable>
          </View>
          <Text style={styles.purpleLabel}>Learning for</Text>
          <Pressable
            testID="learn-goal-minutes"
            onPress={() => openSheet("minutes")}
            style={styles.purpleSelect}
          >
            <Text style={styles.purpleSelectText}>{minutes}</Text>
            <Ionicons name="chevron-down" size={16} color="#0B0B0F" />
          </Pressable>
        </View>

        <Text style={styles.hint}>
          Stay on track with {weekly} engaging activities per week — just {minutes.split(" ")[0]} of practice per day
          keeps steady progress toward fluency.
        </Text>

        <Pressable
          testID="learn-goal-next"
          onPress={submit}
          style={styles.nextBtn}
        >
          <Text style={styles.nextBtnText}>Next</Text>
        </Pressable>
      </ScrollView>

      {/* Picker sheets */}
      <PickerSheet
        visible={sheet === "level"}
        title="Which level do you want to reach?"
        onClose={closeSheet}
      >
        {LEVELS.map((l) => (
          <OptionCard
            key={l.key}
            testID={`learn-goal-level-${l.key}`}
            selected={level === l.key}
            title={l.label}
            body={l.body}
            onPress={() => {
              setLevel(l.key);
              closeSheet();
            }}
          />
        ))}
      </PickerSheet>

      <PickerSheet
        visible={sheet === "time"}
        title="How long to reach it?"
        onClose={closeSheet}
      >
        {TIMES.map((t) => (
          <OptionRow
            key={t.key}
            testID={`learn-goal-time-${t.key}`}
            selected={time === t.key}
            label={t.label}
            onPress={() => {
              setTime(t.key);
              closeSheet();
            }}
          />
        ))}
      </PickerSheet>

      <PickerSheet
        visible={sheet === "reason"}
        title="Why do you want to learn Spanish?"
        onClose={closeSheet}
      >
        {REASONS.map((r) => (
          <OptionRow
            key={r.key}
            testID={`learn-goal-reason-${r.key}`}
            selected={reason === r.key}
            label={r.label}
            onPress={() => {
              setReason(r.key);
              closeSheet();
            }}
          />
        ))}
      </PickerSheet>

      <PickerSheet
        visible={sheet === "weekly"}
        title="Activities per week"
        onClose={closeSheet}
      >
        {ACTIVITIES.map((n) => (
          <OptionRow
            key={n}
            testID={`learn-goal-weekly-${n}`}
            selected={weekly === n}
            label={`${n} per week`}
            onPress={() => {
              setWeekly(n);
              closeSheet();
            }}
          />
        ))}
      </PickerSheet>

      <PickerSheet
        visible={sheet === "minutes"}
        title="Minutes per day"
        onClose={closeSheet}
      >
        {MINUTES.map((m) => (
          <OptionRow
            key={m}
            testID={`learn-goal-min-${m}`}
            selected={minutes === m}
            label={m}
            onPress={() => {
              setMinutes(m);
              closeSheet();
            }}
          />
        ))}
      </PickerSheet>
    </SafeAreaView>
  );
}

const SelectorRow = ({
  value,
  icon,
  onPress,
  selected,
  testID,
}: {
  value: string;
  icon: React.ReactNode;
  onPress: () => void;
  selected?: boolean;
  testID: string;
}) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    style={[
      selectorStyles.row,
      selected && {
        borderColor: learnColors.orange,
        backgroundColor: "rgba(255,92,31,0.14)",
      },
    ]}
  >
    <View
      style={[
        selectorStyles.iconChip,
        selected && { backgroundColor: learnColors.orange },
      ]}
    >
      {icon}
    </View>
    <Text
      style={[
        selectorStyles.value,
        selected && { color: "#FFFFFF", fontFamily: fonts.textBold },
      ]}
    >
      {value}
    </Text>
    <Ionicons name="chevron-forward" size={16} color="#B0B0BD" />
  </Pressable>
);

const selectorStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: learnColors.surface,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  iconChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: learnColors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    flex: 1,
    fontFamily: fonts.textSemi,
    fontSize: 14,
    color: learnColors.onSurfaceSecondary,
  },
});

const OptionCard = ({
  title,
  body,
  selected,
  onPress,
  testID,
}: {
  title: string;
  body: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
}) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    style={[
      optionStyles.card,
      selected && {
        borderColor: learnColors.orange,
        backgroundColor: "rgba(255,92,31,0.14)",
      },
    ]}
  >
    <View style={{ flex: 1 }}>
      <Text style={optionStyles.title}>{title}</Text>
      <Text style={optionStyles.body}>{body}</Text>
    </View>
    {selected && (
      <View style={optionStyles.check}>
        <Ionicons name="checkmark" size={14} color="#FFF" />
      </View>
    )}
  </Pressable>
);

const OptionRow = ({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
}) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    style={[
      optionStyles.row,
      selected && {
        borderColor: learnColors.orange,
        backgroundColor: "rgba(255,92,31,0.14)",
      },
    ]}
  >
    <Text style={[optionStyles.title, { fontSize: 14 }]}>{label}</Text>
    {selected && (
      <View style={optionStyles.check}>
        <Ionicons name="checkmark" size={14} color="#FFF" />
      </View>
    )}
  </Pressable>
);

const optionStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 18,
    backgroundColor: learnColors.surface,
    borderWidth: 1.5,
    borderColor: "transparent",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 999,
    backgroundColor: learnColors.surface,
    borderWidth: 1.5,
    borderColor: "transparent",
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: "#FFFFFF",
  },
  body: {
    fontFamily: fonts.textSemi,
    fontSize: 12,
    color: "#B0B0BD",
    marginTop: 4,
    lineHeight: 17,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: learnColors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
});

const PickerSheet = ({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  const insets = useSafeAreaInsets();
  const sheetBounds = useSheetBounds();
  return (
  <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
    <Pressable style={sheetStyles.backdrop} onPress={onClose}>
      <Pressable
        testID="learn-goal-picker-sheet"
        style={[sheetStyles.sheet, sheetBounds, { paddingBottom: 30 + insets.bottom }]}
        onPress={(e) => e.stopPropagation?.()}
      >
        <View style={sheetStyles.handle} />
        <Text style={sheetStyles.title}>{title}</Text>
        <ScrollView testID="learn-goal-picker-scroll" style={{ maxHeight: 420, flexShrink: 1 }}>{children}</ScrollView>
      </Pressable>
    </Pressable>
  </Modal>
  );
};

const sheetStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: learnColors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 18,
    paddingBottom: 30,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: learnColors.border,
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: "#FFF",
    marginBottom: 12,
  },
});

const makeStyles = () =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: learnColors.bg },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 6,
    },
    backChip: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: learnColors.surfaceRaised,
      alignItems: "center",
      justifyContent: "center",
    },
    closeChip: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: learnColors.surfaceRaised,
      alignItems: "center",
      justifyContent: "center",
    },
    h1: {
      fontFamily: fonts.displayBold,
      fontSize: 18,
      color: "#FFFFFF",
    },
    body: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
    sectionTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 26,
      color: "#FFFFFF",
      fontStyle: "italic",
      marginTop: 8,
      marginBottom: 6,
    },
    purpleCard: {
      backgroundColor: "#DABFFF",
      borderRadius: 24,
      padding: 18,
      marginTop: 6,
      gap: 8,
    },
    purpleTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    purpleTitle: {
      flexShrink: 1,
      fontFamily: fonts.displayBold,
      fontSize: 18,
      color: "#0B0B0F",
    },
    infoChip: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "rgba(0,0,0,0.1)",
      alignItems: "center",
      justifyContent: "center",
    },
    purpleLabel: {
      fontFamily: fonts.textSemi,
      fontSize: 12,
      color: "#0B0B0F",
      opacity: 0.75,
      marginTop: 4,
    },
    purpleSelect: {
      backgroundColor: "rgba(255,255,255,0.55)",
      borderRadius: 999,
      paddingHorizontal: 18,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    purpleSelectText: {
      fontFamily: fonts.textBold,
      fontSize: 14,
      color: "#0B0B0F",
    },
    hint: {
      fontFamily: fonts.textSemi,
      fontSize: 12,
      color: "#B0B0BD",
      textAlign: "center",
      lineHeight: 18,
      marginTop: 8,
      paddingHorizontal: 6,
    },
    nextBtn: {
      backgroundColor: learnColors.orange,
      borderRadius: 999,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 8,
    },
    nextBtnText: {
      fontFamily: fonts.textBold,
      color: "#FFFFFF",
      fontSize: 15,
    },
  });
