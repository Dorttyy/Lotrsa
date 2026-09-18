import { Ionicons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { Avatar } from "@/src/components/Avatar";
import { useAuth } from "@/src/context/AuthContext";
import { fonts } from "@/src/theme";
import { premiumColors, premiumRadius } from "@/src/premium/theme";

export default function PremiumProfile() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top"]}
      testID="premium-profile-screen"
    >
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* Golden hero card */}
        <View style={styles.hero}>
          <View style={styles.heroGlowRing} />
          <Avatar
            name={user?.name}
            url={user?.avatar_url}
            size={100}
            frame={user?.active_frame}
          />
          <View style={styles.tierChip}>
            <Ionicons name="diamond" size={12} color={premiumColors.onGold} />
            <Text style={styles.tierText}>PREMIUM MEMBER</Text>
          </View>
          <Text style={styles.name}>{user?.name || "Member"}</Text>
          {user?.bio ? (
            <Text style={styles.bio} numberOfLines={2}>
              “{user.bio}”
            </Text>
          ) : (
            <Text style={styles.bioMuted}>Verified premium member</Text>
          )}
          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Ionicons name="language" size={11} color={premiumColors.gold} />
              <Text style={styles.metaText}>
                {(user?.learning_language || "—").toUpperCase()}
              </Text>
            </View>
            <View style={styles.metaPill}>
              <Ionicons name="location" size={11} color={premiumColors.gold} />
              <Text style={styles.metaText}>{user?.country || "Global"}</Text>
            </View>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>1.2K</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{user?.coins ?? 0}</Text>
            <Text style={styles.statLabel}>Coins</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>Elite</Text>
            <Text style={styles.statLabel}>Tier</Text>
          </View>
        </View>

        {/* Premium perks */}
        <Text style={styles.section}>Your Premium perks</Text>
        <View style={styles.perksList}>
          <PerkRow icon="chatbubbles" label="Private members-only chats" />
          <PerkRow icon="planet" label="Exclusive Moments feed" />
          <PerkRow icon="mic" label="Elite voice rooms" />
          <PerkRow icon="star" label="Priority customer support" />
          <PerkRow icon="sparkles" label="Custom avatar frames & emojis" />
          <PerkRow icon="shield-checkmark" label="Verified premium badge" />
        </View>

        {/* Nav rows */}
        <View style={styles.navSection}>
          <NavRow
            icon="card"
            label="Manage subscription"
            onPress={() => router.push("/learn/subscription")}
          />
          <NavRow
            icon="trophy"
            label="Achievements"
            onPress={() => router.push("/(tabs)/profile")}
          />
          <NavRow
            icon="gift"
            label="Refer a friend"
            hint="Get 30 days free"
            onPress={() => {}}
          />
          <NavRow
            icon="settings"
            label="Account settings"
            onPress={() => router.push("/edit-profile")}
          />
          <NavRow
            icon="exit"
            label="Back to main app"
            onPress={() => router.push("/(tabs)/profile")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const PerkRow = ({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) => (
  <View style={styles.perkRow}>
    <View style={styles.perkIcon}>
      <Ionicons name={icon} size={15} color={premiumColors.onGold} />
    </View>
    <Text style={styles.perkLabel}>{label}</Text>
    <Ionicons
      name="checkmark-circle"
      size={16}
      color={premiumColors.success}
    />
  </View>
);

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
  <Pressable onPress={onPress} style={styles.navRow} testID={`premium-nav-${label}`}>
    <View style={styles.navIcon}>
      <Ionicons name={icon} size={16} color={premiumColors.gold} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.navLabel}>{label}</Text>
      {hint ? <Text style={styles.navHint}>{hint}</Text> : null}
    </View>
    <Ionicons
      name="chevron-forward"
      size={16}
      color={premiumColors.onSurfaceTertiary}
    />
  </Pressable>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: premiumColors.bg },
  body: { padding: 20, gap: 16, paddingBottom: 40 },
  hero: {
    backgroundColor: premiumColors.surfaceRaised,
    borderRadius: premiumRadius.xl,
    padding: 24,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: premiumColors.gold,
    gap: 6,
    position: "relative",
    overflow: "hidden",
  },
  heroGlowRing: {
    position: "absolute",
    top: -80,
    left: "50%",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: premiumColors.gold + "22",
    marginLeft: -130,
  },
  tierChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: premiumColors.gold,
    borderRadius: premiumRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 10,
  },
  tierText: {
    fontFamily: fonts.textBold,
    fontSize: 10,
    color: premiumColors.onGold,
    letterSpacing: 1.2,
  },
  name: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: premiumColors.onSurface,
    marginTop: 4,
  },
  bio: {
    fontFamily: fonts.text,
    fontSize: 13,
    color: premiumColors.onSurfaceSecondary,
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 18,
  },
  bioMuted: {
    fontFamily: fonts.textSemi,
    fontSize: 12,
    color: premiumColors.onSurfaceTertiary,
  },
  metaRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: premiumColors.surfaceHigh,
    borderRadius: premiumRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaText: {
    fontFamily: fonts.textBold,
    fontSize: 11,
    color: premiumColors.onSurface,
  },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: premiumColors.surfaceRaised,
    borderRadius: premiumRadius.md,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: premiumColors.border,
  },
  statValue: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: premiumColors.gold,
  },
  statLabel: {
    fontFamily: fonts.textSemi,
    fontSize: 11,
    color: premiumColors.onSurfaceSecondary,
    marginTop: 2,
  },
  section: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: premiumColors.onSurface,
    marginTop: 6,
  },
  perksList: {
    backgroundColor: premiumColors.surface,
    borderRadius: premiumRadius.lg,
    padding: 4,
    gap: 2,
    borderWidth: 1,
    borderColor: premiumColors.border,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  perkIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: premiumColors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  perkLabel: {
    flex: 1,
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: premiumColors.onSurface,
  },
  navSection: {
    backgroundColor: premiumColors.surface,
    borderRadius: premiumRadius.lg,
    padding: 4,
    gap: 2,
    borderWidth: 1,
    borderColor: premiumColors.border,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  navIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: premiumColors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    fontFamily: fonts.textBold,
    fontSize: 13,
    color: premiumColors.onSurface,
  },
  navHint: {
    fontFamily: fonts.textSemi,
    fontSize: 11,
    color: premiumColors.gold,
    marginTop: 2,
  },
});
