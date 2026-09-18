import { Ionicons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { fonts } from "@/src/theme";
import { learnColors } from "@/src/learn/theme";

const PLANS = [
  {
    key: "monthly",
    label: "Monthly",
    price: "$14.99",
    cadence: "/mo",
    perks: "Cancel anytime",
    accent: "#DABFFF",
    highlight: false,
  },
  {
    key: "yearly",
    label: "Yearly",
    price: "$79",
    cadence: "/yr",
    perks: "Save 55% · Most popular",
    accent: learnColors.yellow,
    highlight: true,
  },
  {
    key: "lifetime",
    label: "Lifetime",
    price: "$249",
    cadence: "one-time",
    perks: "Learn forever",
    accent: learnColors.green,
    highlight: false,
  },
];

const PERKS: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: "sparkles", label: "Unlimited AI conversation partner" },
  { icon: "school", label: "1-on-1 live classes with teachers" },
  { icon: "flash", label: "Advanced vocab workouts, no ads" },
  { icon: "trophy", label: "Personalised learning plans & goals" },
];

/**
 * Post-goal subscription screen. Purely presentational — a real product would
 * route through Stripe/StoreKit; here we mark the chosen plan and go back to
 * the plan tab.
 */
export default function LearnSubscription() {
  const router = useRouter();
  const [plan, setPlan] = useState<string>("yearly");

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          testID="learn-sub-close"
          onPress={() => router.back()}
          style={styles.iconChip}
          hitSlop={8}
        >
          <Ionicons name="close" size={20} color="#FFF" />
        </Pressable>
        <Text style={styles.h1}>Go Premium</Text>
        <Pressable
          testID="learn-sub-skip"
          onPress={() => router.replace("/learn/dashboard")}
          hitSlop={8}
        >
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>🚀</Text>
          <Text style={styles.heroTitle}>Level up faster</Text>
          <Text style={styles.heroBody}>
            Unlock every course, live class and AI conversation partner —
            personalised to your goal.
          </Text>
        </View>

        <View style={styles.perksList}>
          {PERKS.map((p) => (
            <View key={p.label} style={styles.perkRow}>
              <View style={styles.perkIcon}>
                <Ionicons name={p.icon} size={16} color="#0B0B0F" />
              </View>
              <Text style={styles.perkLabel}>{p.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Choose your plan</Text>

        {PLANS.map((p) => {
          const selected = plan === p.key;
          return (
            <Pressable
              key={p.key}
              testID={`learn-sub-plan-${p.key}`}
              onPress={() => setPlan(p.key)}
              style={[
                styles.planCard,
                selected && {
                  borderColor: learnColors.orange,
                  backgroundColor: "rgba(255,92,31,0.08)",
                },
              ]}
            >
              <View style={[styles.planAccent, { backgroundColor: p.accent }]}>
                <Text style={styles.planAccentText}>
                  {p.label[0]}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.planTitleRow}>
                  <Text style={styles.planTitle}>{p.label}</Text>
                  {p.highlight && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>BEST VALUE</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.planPerks}>{p.perks}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.planPrice}>{p.price}</Text>
                <Text style={styles.planCadence}>{p.cadence}</Text>
              </View>
              <View
                style={[
                  styles.radio,
                  selected && { borderColor: learnColors.orange },
                ]}
              >
                {selected && <View style={styles.radioDot} />}
              </View>
            </Pressable>
          );
        })}

        <Pressable
          testID="learn-sub-start"
          onPress={() => router.replace("/learn/dashboard")}
          style={styles.startBtn}
        >
          <Text style={styles.startBtnText}>Start Premium</Text>
        </Pressable>
        <Text style={styles.finePrint}>
          Recurring subscription. Cancel anytime from your account.
        </Text>
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
  h1: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: "#FFFFFF",
  },
  skip: {
    fontFamily: fonts.textBold,
    fontSize: 13,
    color: learnColors.onSurfaceSecondary,
  },
  body: { padding: 20, gap: 14 },
  heroCard: {
    backgroundColor: learnColors.surfaceRaised,
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    gap: 6,
  },
  heroEmoji: { fontSize: 44 },
  heroTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: "#FFFFFF",
    marginTop: 6,
  },
  heroBody: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: learnColors.onSurfaceSecondary,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 4,
  },
  perksList: {
    backgroundColor: learnColors.surface,
    borderRadius: 20,
    padding: 12,
    gap: 4,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  perkIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: learnColors.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  perkLabel: {
    flex: 1,
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: "#FFFFFF",
  },
  sectionLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: "#FFFFFF",
    marginTop: 4,
    marginBottom: 2,
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 22,
    backgroundColor: learnColors.surface,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  planAccent: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  planAccentText: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: "#0B0B0F",
  },
  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  planTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: "#FFFFFF",
  },
  badge: {
    backgroundColor: learnColors.orange,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: fonts.textBold,
    fontSize: 9,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  planPerks: {
    fontFamily: fonts.textSemi,
    fontSize: 12,
    color: learnColors.onSurfaceSecondary,
    marginTop: 2,
  },
  planPrice: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: "#FFFFFF",
  },
  planCadence: {
    fontFamily: fonts.textSemi,
    fontSize: 11,
    color: learnColors.onSurfaceSecondary,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: learnColors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: learnColors.orange,
  },
  startBtn: {
    backgroundColor: learnColors.orange,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
  },
  startBtnText: {
    fontFamily: fonts.textBold,
    fontSize: 15,
    color: "#FFFFFF",
  },
  finePrint: {
    fontFamily: fonts.textSemi,
    fontSize: 11,
    color: learnColors.onSurfaceTertiary,
    textAlign: "center",
    marginTop: 4,
  },
});
