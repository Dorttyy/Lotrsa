import { Ionicons } from "@/src/ui/icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { api } from "@/src/utils/api";
import { proColors, proFonts, proRadius, proShadow } from "@/src/pro/theme";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// Compact set of teaching slots (local time).
const SLOTS = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];

interface Block {
  day: number;
  slot: string;
}

const keyOf = (b: Block) => `${b.day}-${b.slot}`;

export default function ProAvailability() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ blocks: Block[] }>("/pro/availability");
      setSelected(new Set(res.blocks.map(keyOf)));
    } catch {
      // silent
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggle = (day: number, slot: string) => {
    const k = `${day}-${slot}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const blocks: Block[] = Array.from(selected).map((k) => {
        const [day, slot] = k.split(/-(.+)/);
        return { day: parseInt(day, 10), slot };
      });
      await api.put("/pro/availability", { blocks });
      setSaved(true);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="pro-availability-screen">
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={proColors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>PRO · TUTOR</Text>
          <Text style={styles.title}>Availability</Text>
        </View>
      </View>

      <Text style={styles.hint}>
        Tap the blocks when you are open to teach. Students see these in their
        local time.
      </Text>

      <ScrollView
        contentContainerStyle={styles.gridWrap}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.slotLabelCell} />
          {DAYS.map((d) => (
            <Text key={d} style={styles.dayHead}>
              {d}
            </Text>
          ))}
        </View>
        {SLOTS.map((slot) => (
          <View key={slot} style={styles.row}>
            <Text style={styles.slotLabel}>{slot}</Text>
            {DAYS.map((_, day) => {
              const active = selected.has(`${day}-${slot}`);
              return (
                <Pressable
                  key={day}
                  testID={`pro-slot-${day}-${slot}`}
                  onPress={() => toggle(day, slot)}
                  style={[styles.cell, active && styles.cellActive]}
                >
                  {active && (
                    <Ionicons name="checkmark" size={14} color={proColors.onAccent} />
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
        <Text style={styles.tzNote}>
          {selected.size} block{selected.size === 1 ? "" : "s"} selected · shown to
          students across EST, GMT & JST
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          testID="pro-availability-save"
          onPress={save}
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          disabled={saving}
        >
          <Text style={styles.saveText}>
            {saved ? "Saved ✓" : saving ? "Saving…" : "Save availability"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: proColors.bg },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingTop: 6 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: proColors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: proColors.border,
  },
  kicker: { fontFamily: proFonts.sansSemi, fontSize: 11, letterSpacing: 2, color: proColors.terracotta },
  title: { fontFamily: proFonts.serifBold, fontSize: 26, color: proColors.ink, marginTop: 2 },
  hint: {
    fontFamily: proFonts.sans,
    fontSize: 13.5,
    color: proColors.inkSoft,
    lineHeight: 20,
    paddingHorizontal: 22,
    marginTop: 12,
  },
  gridWrap: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  slotLabelCell: { width: 44 },
  dayHead: {
    flex: 1,
    textAlign: "center",
    fontFamily: proFonts.sansSemi,
    fontSize: 11.5,
    color: proColors.inkSoft,
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  slotLabel: {
    width: 44,
    fontFamily: proFonts.sansSemi,
    fontSize: 11,
    color: proColors.inkFaint,
  },
  cell: {
    flex: 1,
    height: 40,
    marginHorizontal: 3,
    borderRadius: 10,
    backgroundColor: proColors.surface,
    borderWidth: 1,
    borderColor: proColors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cellActive: { backgroundColor: proColors.sage, borderColor: proColors.sage },
  tzNote: {
    fontFamily: proFonts.sans,
    fontSize: 12,
    color: proColors.inkSoft,
    textAlign: "center",
    marginTop: 14,
  },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: proColors.border,
  },
  saveBtn: {
    backgroundColor: proColors.terracotta,
    borderRadius: proRadius.md,
    paddingVertical: 16,
    alignItems: "center",
    ...proShadow.soft,
  },
  saveText: { fontFamily: proFonts.sansBold, fontSize: 16, color: proColors.onAccent },
});
