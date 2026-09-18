import { Ionicons } from "@/src/ui/icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeOut, ZoomIn } from "react-native-reanimated";

import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";

/**
 * Generic long-press action sheet — the SAME HelloTalk-style popup used for
 * chat bubbles, reused for Moments posts and comments. A blurred backdrop dims
 * the screen, the pressed content stays visible as a highlighted pill, and a
 * rounded card below holds a row of round quick-actions + a labelled list.
 * The available actions are passed in by the caller so each surface (post /
 * comment) shows only context-appropriate options.
 */

export type SheetIcon = React.ComponentProps<typeof Ionicons>["name"];
export interface QuickAction {
  id: string;
  icon: SheetIcon;
  active?: boolean;
}
export interface SheetRow {
  id: string;
  icon: SheetIcon;
  label: string;
  active?: boolean;
  danger?: boolean;
}
export interface SheetHighlight {
  kind: "text" | "voice";
  text?: string;
  durationMs?: number | null;
}

interface Props {
  visible: boolean;
  anchor: { x: number; y: number; width: number; height: number } | null;
  align?: "left" | "right";
  highlight: SheetHighlight | null;
  quick?: QuickAction[];
  rows?: SheetRow[];
  onClose: () => void;
  onSelect: (id: string) => void;
}

const formatDuration = (ms?: number | null): string => {
  const totalSec = Math.max(1, Math.round((ms || 0) / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export function ActionSheetPopup({
  visible,
  anchor,
  align = "left",
  highlight,
  quick = [],
  rows = [],
  onClose,
  onSelect,
}: Props) {
  const { colors, mode } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const { width: screenW, height: screenH } = Dimensions.get("window");

  if (!visible || !anchor) return null;

  const ACCENT = colors.brand;
  const INK = colors.onSurface;

  const CARD_WIDTH = Math.min(258, screenW - 48);
  const CARD_HEIGHT =
    (quick.length ? 90 : 0) + rows.length * 52 + 28;

  const isVoice = highlight?.kind === "voice";
  const pillLabel = isVoice ? "Voice message" : (highlight?.text || "").trim();
  const pillFontSize =
    pillLabel.length > 260
      ? 12
      : pillLabel.length > 140
        ? 13
        : pillLabel.length > 60
          ? 14.5
          : 16;
  const PILL_MAX_W = Math.min(CARD_WIDTH - 20, screenW - 60);
  const estLines = Math.max(
    1,
    Math.ceil(pillLabel.length / (PILL_MAX_W / (pillFontSize * 0.58))),
  );
  const PILL_HEIGHT = isVoice
    ? 56
    : Math.min(screenH * 0.4, 22 + Math.min(estLines, 12) * (pillFontSize * 1.4));

  const GAP = 14;
  const TOP_SAFE = 70;
  const BOTTOM_SAFE = 40;
  const maxPillTop = screenH - BOTTOM_SAFE - GAP - CARD_HEIGHT - PILL_HEIGHT;
  const pillTop = Math.max(
    TOP_SAFE,
    Math.min(anchor.y, Math.max(TOP_SAFE, maxPillTop)),
  );
  const cardTop = pillTop + PILL_HEIGHT + GAP;

  const pillWidth = isVoice
    ? 180
    : Math.min(PILL_MAX_W, Math.max(80, pillLabel.length * pillFontSize * 0.62 + 28));
  const anchorLeft =
    align === "right" ? anchor.x + anchor.width - pillWidth : anchor.x;
  const pillLeft = Math.max(16, Math.min(anchorLeft, screenW - pillWidth - 16));
  let cardLeft =
    align === "right" ? anchor.x + anchor.width - CARD_WIDTH : anchor.x;
  cardLeft = Math.max(16, Math.min(cardLeft, screenW - CARD_WIDTH - 16));

  const act = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    onSelect(id);
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <BlurView
          intensity={Platform.OS === "android" ? 40 : 32}
          tint={mode === "dark" ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.dim} pointerEvents="none" />

        {isVoice ? (
          <View
            pointerEvents="none"
            style={{ position: "absolute", top: pillTop, left: pillLeft }}
          >
            <View style={[styles.voicePill, { width: pillWidth }]}>
              <Ionicons name="play" size={22} color={INK} />
              <Text style={styles.voiceDuration}>
                {formatDuration(highlight?.durationMs)}
              </Text>
            </View>
          </View>
        ) : pillLabel ? (
          <View
            pointerEvents="none"
            style={[
              styles.highlightPill,
              { top: pillTop, left: pillLeft, maxWidth: PILL_MAX_W, minWidth: 60 },
            ]}
          >
            <View style={[styles.pillDot, styles.pillDotStart]} />
            <Text
              style={[styles.highlightText, { fontSize: pillFontSize }]}
              numberOfLines={12}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {pillLabel}
            </Text>
            <View style={[styles.pillDot, styles.pillDotEnd]} />
          </View>
        ) : null}

        <Animated.View
          entering={ZoomIn.duration(170)}
          exiting={FadeOut.duration(120)}
          style={[styles.card, { left: cardLeft, top: cardTop, width: CARD_WIDTH }]}
        >
          <Pressable onPress={(e) => e.stopPropagation?.()} style={{ borderRadius: 26 }}>
            {quick.length > 0 && (
              <>
                <View style={styles.roundRow}>
                  {quick.map((q) => (
                    <Pressable
                      key={q.id}
                      testID={`sheet-quick-${q.id}`}
                      onPress={() => act(q.id)}
                      hitSlop={6}
                      style={({ pressed }) => [
                        styles.roundCircle,
                        q.active && styles.roundCircleActive,
                        pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] },
                      ]}
                    >
                      <Ionicons name={q.icon} size={22} color={q.active ? ACCENT : INK} />
                    </Pressable>
                  ))}
                </View>
                <View style={styles.divider} />
              </>
            )}
            <View>
              {rows.map((r) => (
                <Pressable
                  key={r.id}
                  testID={`sheet-row-${r.id}`}
                  onPress={() => act(r.id)}
                  style={({ pressed }) => [
                    styles.listRow,
                    pressed && styles.listRowPressed,
                  ]}
                >
                  <View style={styles.listIcon}>
                    <Ionicons
                      name={r.icon}
                      size={19}
                      color={r.danger ? "#EF4444" : r.active ? ACCENT : INK}
                    />
                  </View>
                  <Text
                    style={[
                      styles.listLabel,
                      r.active && { color: ACCENT },
                      r.danger && { color: "#EF4444" },
                    ]}
                  >
                    {r.label}
                  </Text>
                  {r.active && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={ACCENT}
                      style={{ marginLeft: "auto" }}
                    />
                  )}
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: { flex: 1 },
    dim: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0, 0, 0, 0.10)",
    },
    highlightPill: {
      position: "absolute",
      backgroundColor: colors.bubbleTheirs,
      borderRadius: 18,
      paddingVertical: 9,
      paddingHorizontal: 16,
      justifyContent: "center",
    },
    highlightText: {
      fontFamily: fonts.text,
      color: colors.onSurface,
    },
    pillDot: {
      position: "absolute",
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.brand,
    },
    pillDotStart: { left: -3, top: -3 },
    pillDotEnd: { right: -3, bottom: -3 },
    card: {
      position: "absolute",
      backgroundColor: colors.surface,
      borderRadius: 26,
      paddingHorizontal: 8,
      paddingTop: 14,
      paddingBottom: 12,
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
      elevation: 16,
    },
    roundRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      paddingHorizontal: 8,
      paddingBottom: 4,
    },
    roundCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    roundCircleActive: { backgroundColor: colors.brandTertiary },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.divider,
      marginTop: 10,
      marginBottom: 2,
      marginHorizontal: 8,
    },
    listRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: radius.md,
    },
    listRowPressed: { backgroundColor: colors.surfaceSecondary },
    listIcon: { width: 26, alignItems: "center" },
    listLabel: {
      fontFamily: fonts.textSemi,
      fontSize: 16,
      color: colors.onSurface,
    },
    voicePill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.bubbleTheirs,
      borderRadius: 22,
      paddingVertical: 12,
      paddingLeft: 16,
      paddingRight: 20,
      justifyContent: "space-between",
      minWidth: 160,
    },
    voiceDuration: {
      fontFamily: fonts.textSemi,
      fontSize: 14,
      color: colors.onSurfaceSecondary,
      marginLeft: 12,
    },
  });
