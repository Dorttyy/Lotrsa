/**
 * Paid Practice Overview — reached from the "Introducing Paid Practice" banner
 * on the Connect tab. Explains what Paid Practice is and the rules for talking
 * to paid-practice partners.
 */

import { Ionicons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";

const GOLD = "#F59E0B";
const GOLD_DEEP = "#B45309";

const Section = ({
  title,
  points,
  styles,
}: {
  title: string;
  points: string[];
  styles: ReturnType<typeof makeStyles>;
}) => (
  <View style={styles.section}>
    <View style={styles.sectionHeadRow}>
      <View style={styles.accentBar} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {points.map((p) => (
      <View key={p} style={styles.bulletRow}>
        <View style={styles.bulletDot} />
        <Text style={styles.bulletText}>{p}</Text>
      </View>
    ))}
  </View>
);

export default function PaidPracticeOverview() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom"]}
      testID="paid-practice-overview"
    >
      <View style={styles.header}>
        <Pressable
          testID="ppo-back"
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Paid Practice Overview</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Ionicons name="chatbubbles" size={54} color="#FFFFFF" />
          <Text style={styles.heroText}>Paid Practice</Text>
        </View>

        <View style={styles.card}>
          <Section
            title="What is Paid Practice?"
            points={[
              "Paid Practice lets you conveniently find high-quality language partners. Have better conversations, get more replies, and learn languages faster with Paid Practice!",
            ]}
            styles={styles}
          />
          <Section
            title="Where do I find Paid Practice?"
            points={[
              "Go to the 'Connect' tab, and tap the 'Paid Practice' filter to view a list of high-quality language partners.",
            ]}
            styles={styles}
          />
          <Section
            title="Paid Practice Rules"
            points={[
              "Spend HT Coins to start a paid practice. If your partner does not reply within 24 hours then the HT coins will be automatically refunded to your account.",
              "You can earn diamonds for paid practice, and you can redeem diamonds for cash or in-app rewards.",
              "Note, sending gifts in a paid practice does not cost any HT coins.",
            ]}
            styles={styles}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surfaceSecondary,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
    },
    backBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontFamily: fonts.display,
      fontSize: 18,
      color: colors.onSurface,
    },
    scroll: {
      paddingBottom: spacing.xxxl,
    },
    hero: {
      backgroundColor: GOLD,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingVertical: spacing.xxl,
    },
    heroText: {
      fontFamily: fonts.display,
      fontSize: 22,
      color: "#FFFFFF",
    },
    card: {
      backgroundColor: colors.surface,
      margin: spacing.lg,
      borderRadius: radius.lg,
      padding: spacing.xl,
      gap: spacing.xl,
    },
    section: {
      gap: spacing.md,
    },
    sectionHeadRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    accentBar: {
      width: 4,
      height: 18,
      borderRadius: 2,
      backgroundColor: GOLD,
    },
    sectionTitle: {
      fontFamily: fonts.displaySemi,
      fontSize: 17,
      color: colors.onSurface,
    },
    bulletRow: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingLeft: spacing.md,
    },
    bulletDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: GOLD_DEEP,
      marginTop: 8,
    },
    bulletText: {
      flex: 1,
      fontFamily: fonts.text,
      fontSize: 14.5,
      lineHeight: 22,
      color: colors.onSurfaceSecondary,
    },
  });
