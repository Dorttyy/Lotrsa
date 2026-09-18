import { Ionicons } from "@/src/ui/icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useScreenSpace } from "@/src/hooks/use-screen-space";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
} from "react-native-reanimated";

import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";

interface CheckInModalProps {
  visible: boolean;
  streak: number;
  coinsAwarded: number;
  totalCoins: number;
  onClose: () => void;
}

/** Daily streak check-in reward pop-up with a springy flame animation. */
export const CheckInModal: React.FC<CheckInModalProps> = ({
  visible,
  streak,
  coinsAwarded,
  totalCoins,
  onClose,
}) => {
  const { colors } = useTheme();
  const { safeHeight, insets } = useScreenSpace();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const flameScale = useSharedValue(0);
  const coinScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      flameScale.value = 0;
      coinScale.value = 0;
      flameScale.value = withSequence(
        withDelay(150, withSpring(1.25, { damping: 7 })),
        withSpring(1, { damping: 9 }),
      );
      coinScale.value = withDelay(420, withSpring(1, { damping: 8 }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [visible, flameScale, coinScale]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));
  const coinStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinScale.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View testID="checkin-backdrop" style={[styles.backdrop, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
        <Animated.View entering={FadeInDown.springify().damping(14)} style={[styles.card, { maxHeight: safeHeight - spacing.xl * 2 }]}>
          <ScrollView testID="checkin-content" style={{ flexShrink: 1 }}>
          <LinearGradient
            colors={["#F59E0B", "#F97316"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <Animated.View style={[styles.flameCircle, flameStyle]}>
              <Ionicons name="flame" size={44} color="#FFFFFF" />
            </Animated.View>
            <Text style={styles.headerTitle}>Day {streak} Streak!</Text>
            <Text style={styles.headerSub}>Daily check-in complete</Text>
          </LinearGradient>

          <View style={styles.body}>
            <Animated.View style={[styles.coinRow, coinStyle]}>
              <View style={styles.coinIcon}>
                <Text style={styles.coinEmoji}>🪙</Text>
              </View>
              <Text style={styles.coinText}>+{coinsAwarded} Coins</Text>
            </Animated.View>
            <Text style={styles.totalText}>
              You now have <Text style={styles.totalNum}>{totalCoins}</Text> coins
            </Text>
            <Text style={styles.hint}>
              Come back tomorrow to keep your streak growing!
            </Text>
            <Pressable testID="checkin-close-btn" style={styles.btn} onPress={onClose}>
              <Text style={styles.btnText}>Awesome!</Text>
            </Pressable>
          </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(15,23,42,0.55)",
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xl,
    },
    card: {
      width: "100%",
      maxWidth: 340,
      borderRadius: radius.lg,
      overflow: "hidden",
      backgroundColor: colors.surface,
    },
    header: {
      alignItems: "center",
      paddingVertical: spacing.xl,
      gap: 6,
    },
    flameCircle: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: "rgba(255,255,255,0.22)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    headerTitle: {
      fontFamily: fonts.display,
      fontSize: 24,
      color: "#FFFFFF",
    },
    headerSub: {
      fontFamily: fonts.textSemi,
      fontSize: 13,
      color: "rgba(255,255,255,0.85)",
    },
    body: {
      alignItems: "center",
      padding: spacing.xl,
      gap: spacing.md,
    },
    coinRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: "rgba(245,158,11,0.12)",
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    coinIcon: {
      alignItems: "center",
      justifyContent: "center",
    },
    coinEmoji: {
      fontSize: 22,
    },
    coinText: {
      fontFamily: fonts.display,
      fontSize: 20,
      color: "#F59E0B",
    },
    totalText: {
      fontFamily: fonts.text,
      fontSize: 14,
      color: colors.onSurfaceSecondary,
    },
    totalNum: {
      fontFamily: fonts.textBold,
      color: colors.onSurface,
    },
    hint: {
      fontFamily: fonts.text,
      fontSize: 12.5,
      color: colors.onSurfaceSecondary,
      textAlign: "center",
    },
    btn: {
      alignSelf: "stretch",
      alignItems: "center",
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingVertical: spacing.md + 2,
      marginTop: spacing.xs,
    },
    btnText: {
      fontFamily: fonts.textBold,
      fontSize: 16,
      color: colors.onBrand,
    },
  });
