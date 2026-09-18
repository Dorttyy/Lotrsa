import { Ionicons } from "@/src/ui/icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/utils/api";
import { LessonsTopBar } from "@/src/lessons/LessonsTopBar";
import { lessonColors, lessonFonts, lessonRadius, lessonShadow } from "@/src/lessons/theme";

interface Skill {
  lesson_id: string;
  title: string;
  icon: string;
  completed: boolean;
  unlocked: boolean;
}
interface Unit {
  index: number;
  title: string;
  color: string;
  skills: Skill[];
}
interface Profile {
  streak: number;
  gems: number;
  hearts: number;
  active_course: string;
}

// Snaking offsets for the path nodes.
const OFFSETS = [0, 46, 72, 46, 0, -46, -72, -46];

export default function LessonsLearn() {
  const router = useRouter();
  const { user } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [me, path] = await Promise.all([
        api.get<Profile>("/lessons/me"),
        api.get<{ units: Unit[] }>("/lessons/path"),
      ]);
      setProfile(me);
      setUnits(path.units);
    } catch {
      // silent
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  let nodeCounter = 0;
  const firstUncompleted = (() => {
    for (const u of units) for (const s of u.skills) if (!s.completed) return s.lesson_id;
    return null;
  })();

  return (
    <SafeAreaView style={styles.screen} edges={["top"]} testID="lessons-learn-screen">
      <LessonsTopBar
        streak={profile?.streak ?? 0}
        gems={profile?.gems ?? 0}
        hearts={profile?.hearts ?? 5}
        flag={profile?.active_course ?? "es"}
        showExit
      />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {units.map((unit) => (
          <View key={unit.index}>
            <View style={[styles.unitBanner, { backgroundColor: unit.color }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.unitKicker}>UNIT {unit.index + 1}</Text>
                <Text style={styles.unitTitle}>{unit.title}</Text>
              </View>
              <Ionicons name="book" size={22} color="#fff" />
            </View>

            <View style={styles.path}>
              {unit.skills.map((s) => {
                const off = OFFSETS[nodeCounter % OFFSETS.length];
                nodeCounter += 1;
                const isCurrent = s.lesson_id === firstUncompleted;
                return (
                  <View key={s.lesson_id} style={[styles.nodeRow, { transform: [{ translateX: off }] }]}>
                    <Pressable
                      testID={`lessons-node-${s.lesson_id}`}
                      disabled={!s.unlocked}
                      onPress={() => router.push(`/lessons/lesson/${s.lesson_id}`)}
                      style={styles.nodeWrap}
                    >
                      {isCurrent && <View style={[styles.startPill]}><Text style={styles.startPillText}>START</Text></View>}
                      <View
                        style={[
                          styles.nodeEdge,
                          {
                            backgroundColor: s.completed
                              ? lessonColors.greenDark
                              : s.unlocked
                                ? (isCurrent ? unit.color : lessonColors.borderStrong)
                                : lessonColors.border,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.node,
                            {
                              backgroundColor: s.completed
                                ? lessonColors.green
                                : s.unlocked
                                  ? (isCurrent ? unit.color : lessonColors.surfaceSoft)
                                  : lessonColors.surfaceSoft,
                            },
                          ]}
                        >
                          <Ionicons
                            name={s.completed ? "star" : s.unlocked ? (s.icon as any) : "lock-closed"}
                            size={26}
                            color={s.completed ? "#fff" : s.unlocked ? (isCurrent ? "#fff" : lessonColors.inkFaint) : lessonColors.inkFaint}
                          />
                        </View>
                      </View>
                      <Text style={styles.nodeLabel} numberOfLines={1}>{s.title}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        ))}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lessonColors.bg },
  body: { paddingBottom: 30 },
  unitBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 6,
    padding: 18,
    borderRadius: lessonRadius.lg,
    ...lessonShadow.card,
  },
  unitKicker: { fontFamily: lessonFonts.bold, fontSize: 11, letterSpacing: 1.5, color: "rgba(255,255,255,0.85)" },
  unitTitle: { fontFamily: lessonFonts.black, fontSize: 20, color: "#fff", marginTop: 2 },
  path: { alignItems: "center", paddingVertical: 8 },
  nodeRow: { alignItems: "center", marginVertical: 10 },
  nodeWrap: { alignItems: "center" },
  nodeEdge: { borderRadius: 999, paddingBottom: 6 },
  node: { width: 66, height: 66, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  nodeLabel: { fontFamily: lessonFonts.bold, fontSize: 12, color: lessonColors.inkSoft, marginTop: 6, maxWidth: 90, textAlign: "center" },
  startPill: {
    position: "absolute",
    top: -24,
    backgroundColor: lessonColors.surface,
    borderRadius: lessonRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 5,
    ...lessonShadow.card,
  },
  startPillText: { fontFamily: lessonFonts.black, fontSize: 11, color: lessonColors.green, letterSpacing: 0.5 },
});
