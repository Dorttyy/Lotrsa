import { Ionicons, MaterialCommunityIcons } from "@/src/ui/icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Dimensions,
  Image,
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
 * HelloTalk-style message action sheet that appears when a user long-presses a
 * chat bubble. The screen dims behind a blurred backdrop, the pressed message
 * stays visible as a highlighted "pill" at (roughly) its original position,
 * and a single rounded card below it holds:
 *   • a row of 4 circular quick-action buttons (Reply / Copy / Read / Save)
 *   • a labelled action list (Translation · AI Corrections · Correction · Practice)
 *   • [voice only] Transcription
 *   • a divider
 *   • [voice only] Share
 *   • [own message] Recall
 *   • Pin (or Unpin) · Multi-select
 *
 * The list is NOT scrollable — every relevant option is always visible. Very
 * long messages shrink their font in the highlight pill so they always fit
 * fully on-screen without overlapping the action card.
 */

export const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🙏", "👍", "🔥"];

const formatDuration = (ms?: number | null): string => {
  const totalSec = Math.max(1, Math.round((ms || 0) / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export type MsgMenuAction =
  | "reply"
  | "copy"
  | "readAloud"
  | "save"
  | "translate"
  | "aiCorrect"
  | "correct"
  | "practice"
  | "pin"
  | "multiSelect"
  | "transcription"
  | "share"
  | "recall"
  | "aiVocab"
  | "extractText"
  | "delete";

interface Props {
  visible: boolean;
  anchor: { x: number; y: number; width: number; height: number } | null;
  mine: boolean;
  hasText: boolean;
  isVoice?: boolean;
  isImage?: boolean;
  messageText?: string;
  voiceDurationMs?: number | null;
  imageUri?: string;
  currentReaction?: string; // kept for API compat; not shown in this design
  pinned?: boolean;
  saved?: boolean;
  practiced?: boolean;
  hasManualCorrection?: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void; // kept for API compat
  onAction: (action: MsgMenuAction) => void;
}

export function MessageReactionsPopup({
  visible,
  anchor,
  mine,
  hasText,
  isVoice,
  isImage,
  messageText,
  voiceDurationMs,
  imageUri,
  pinned,
  saved,
  practiced,
  hasManualCorrection,
  onClose,
  onAction,
}: Props) {
  const { colors, mode } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const ACCENT = colors.brand;
  const INK = colors.onSurface;
  const { width: screenW, height: screenH } = Dimensions.get("window");

  const RoundBtn = ({
    testID,
    icon,
    active,
    onPress,
  }: {
    testID: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    active?: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      testID={testID}
      style={({ pressed }) => [
        styles.roundCircle,
        active && styles.roundCircleActive,
        pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] },
      ]}
      onPress={onPress}
      hitSlop={6}
    >
      <Ionicons name={icon} size={22} color={active ? ACCENT : INK} />
    </Pressable>
  );

  const ListRow = ({
    testID,
    left,
    label,
    ai,
    active,
    danger,
    onPress,
  }: {
    testID: string;
    left: React.ReactNode;
    label: string;
    ai?: boolean;
    active?: boolean;
    danger?: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]}
    >
      <View style={styles.listIcon}>{left}</View>
      <Text
        style={[
          styles.listLabel,
          active && { color: ACCENT },
          danger && { color: "#EF4444" },
        ]}
      >
        {label}
      </Text>
      {ai && <Text style={styles.aiBadgeText}>AI</Text>}
      {active && !ai && (
        <Ionicons
          name="checkmark"
          size={16}
          color={ACCENT}
          style={{ marginLeft: "auto" }}
        />
      )}
    </Pressable>
  );

  if (!visible || !anchor) return null;

  // ── Card sizing ────────────────────────────────────────────────────────
  // Slightly narrower than before so the sheet feels compact next to the
  // pressed bubble (matches the HelloTalk reference).
  const CARD_WIDTH = Math.min(258, screenW - 48);
  // Estimated height (no scroll): 4 round buttons row + up to 8 list rows.
  const rowCount = isImage
    ? 3 // AI Vocab + Extract text & translate + multi-select
    : (hasText ? 4 : 0) + // translate + ai + correct + practice
      (isVoice ? 1 : 0) + // transcription
      (isVoice ? 1 : 0) + // share
      (mine ? 1 : 0) + // recall
      2; // pin + multi-select
  const CARD_HEIGHT =
    16 /* pt */ + 78 /* round row */ + 12 /* divider */ + rowCount * 52 + 16 /* pb */;

  // ── Highlighted-message pill sizing ────────────────────────────────────
  // The pill is narrower than the card so long messages wrap onto more
  // lines (taller vertically) — reference shows a tall, narrow highlight.
  const PILL_MAX_W = Math.min(CARD_WIDTH - 20, screenW - 60);
  const rawText = (messageText || "").trim();
  const pillLabel = isVoice ? "Voice message" : isImage ? "Photo" : rawText;
  // Image highlight: show the pressed photo itself at (roughly) its bubble
  // size, clamped so the action card still fits below it.
  const imgW = isImage
    ? Math.max(120, Math.min(anchor.width || 200, 250))
    : 0;
  const imgH = isImage
    ? Math.max(
        90,
        Math.min(
          anchor.width > 0
            ? (anchor.height / anchor.width) * imgW
            : imgW,
          Math.min(280, screenH * 0.32),
        ),
      )
    : 0;
  // Auto-shrink font for long text so the whole message is visible.
  const pillFontSize =
    pillLabel.length > 260 ? 12 : pillLabel.length > 140 ? 13 : pillLabel.length > 60 ? 14.5 : 16;
  const estimatedPillLines = Math.max(
    1,
    Math.ceil(pillLabel.length / (PILL_MAX_W / (pillFontSize * 0.58))),
  );
  const PILL_HEIGHT = isImage
    ? imgH
    : isVoice
      ? 56
      : Math.min(screenH * 0.45, 22 + Math.min(estimatedPillLines, 14) * (pillFontSize * 1.4));

  // ── Layout: pill sits above the card. Everything is clamped on-screen. ─
  const GAP = 14;
  const TOP_SAFE = 60;
  const BOTTOM_SAFE = 40;
  const availableH = screenH - TOP_SAFE - BOTTOM_SAFE;
  const totalH = PILL_HEIGHT + GAP + CARD_HEIGHT;

  let pillTop: number;
  let cardTop: number;
  if (totalH <= availableH) {
    // Try to keep the pill near its original y; nudge up/down if needed.
    let desiredPillTop = anchor.y;
    // Clamp so both pill and card fit above BOTTOM_SAFE and below TOP_SAFE.
    const minPillTop = TOP_SAFE;
    const maxPillTop = screenH - BOTTOM_SAFE - GAP - CARD_HEIGHT - PILL_HEIGHT;
    desiredPillTop = Math.max(minPillTop, Math.min(desiredPillTop, maxPillTop));
    pillTop = desiredPillTop;
    cardTop = pillTop + PILL_HEIGHT + GAP;
  } else {
    // Not enough room even after shrinking — center everything in the viewport.
    pillTop = TOP_SAFE;
    cardTop = pillTop + PILL_HEIGHT + GAP;
  }

  // Horizontal alignment: keep the message on the same side (mine → right,
  // partner → left), fall back to a centered pill for very long messages.
  const voiceWidth = 180;
  const pillWidth = isImage
    ? imgW
    : isVoice
      ? voiceWidth
      : Math.min(
          PILL_MAX_W,
          Math.max(80, pillLabel.length * pillFontSize * 0.62 + 28),
        );
  const pillLeftFromAnchor = mine
    ? anchor.x + anchor.width - pillWidth
    : anchor.x;
  const pillLeft = Math.max(16, Math.min(pillLeftFromAnchor, screenW - pillWidth - 16));

  // Card horizontal: align to the pressed message's side, clamped on-screen.
  let cardLeft = mine
    ? anchor.x + anchor.width - CARD_WIDTH
    : anchor.x;
  cardLeft = Math.max(16, Math.min(cardLeft, screenW - CARD_WIDTH - 16));

  const act = (a: MsgMenuAction) => {
    Haptics.selectionAsync().catch(() => {});
    onAction(a);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <BlurView
          intensity={Platform.OS === "android" ? 40 : 32}
          tint={mode === "dark" ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.dim} pointerEvents="none" />

        {/* Highlighted pill of the pressed message */}
        {isImage && imageUri ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: pillTop,
              left: pillLeft,
              width: imgW,
              height: imgH,
            }}
          >
            <Image
              source={{ uri: imageUri }}
              style={{ width: imgW, height: imgH, borderRadius: 16 }}
              resizeMode="cover"
            />
          </View>
        ) : isVoice ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: pillTop,
              left: pillLeft,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <View style={[styles.voicePill, { width: pillWidth }]}>
              <Ionicons name="play" size={22} color={INK} />
              <Text style={styles.voiceDuration}>
                {formatDuration(voiceDurationMs)}
              </Text>
            </View>
            <View style={styles.voiceAffordance}>
              <MaterialCommunityIcons
                name="microphone-outline"
                size={16}
                color={INK}
              />
              <Text style={styles.voiceAffordanceSup}>A</Text>
            </View>
          </View>
        ) : !!pillLabel ? (
          <View
            pointerEvents="none"
            style={[
              styles.highlightPill,
              {
                top: pillTop,
                left: pillLeft,
                maxWidth: PILL_MAX_W,
                minWidth: 60,
              },
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

        {/* Action card */}
        <Animated.View
          entering={ZoomIn.duration(170)}
          exiting={FadeOut.duration(120)}
          style={[styles.card, { left: cardLeft, top: cardTop, width: CARD_WIDTH }]}
        >
          <Pressable onPress={(e) => e.stopPropagation?.()} style={{ borderRadius: 26 }}>
            {/* Top row of round quick-action buttons */}
            <View style={styles.roundRow}>
              <RoundBtn
                testID="msg-round-reply"
                icon="arrow-undo-outline"
                onPress={() => act("reply")}
              />
              {(hasText || isImage) && (
                <RoundBtn
                  testID="msg-round-copy"
                  icon="copy-outline"
                  onPress={() => act("copy")}
                />
              )}
              {hasText && (
                <RoundBtn
                  testID="msg-round-read"
                  icon="volume-high-outline"
                  onPress={() => act("readAloud")}
                />
              )}
              <RoundBtn
                testID="msg-round-save"
                icon={saved ? "bookmark" : "bookmark-outline"}
                active={saved}
                onPress={() => act("save")}
              />
            </View>

            <View style={styles.divider} />

            {/* Labelled action list — everything visible, no scroll */}
            <View>
              {hasText && (
                <ListRow
                  testID="msg-list-translate"
                  onPress={() => act("translate")}
                  left={<Text style={styles.glyph}>文A</Text>}
                  label="Translation"
                  ai
                />
              )}
              {hasText && (
                <ListRow
                  testID="msg-list-aicorrect"
                  onPress={() => act("aiCorrect")}
                  left={<Ionicons name="sparkles-outline" size={19} color={INK} />}
                  label="AI Corrections"
                  ai
                />
              )}
              {hasText && (
                <ListRow
                  testID="msg-list-correct"
                  onPress={() => act("correct")}
                  left={<Text style={styles.abc}>Abc</Text>}
                  label="Correction"
                  active={hasManualCorrection}
                />
              )}
              {hasText && (
                <ListRow
                  testID="msg-list-practice"
                  onPress={() => act("practice")}
                  left={<Ionicons name="locate-outline" size={19} color={INK} />}
                  label="Practice"
                  active={practiced}
                />
              )}
              {isImage && (
                <ListRow
                  testID="msg-list-aivocab"
                  onPress={() => act("aiVocab")}
                  left={<Text style={styles.aiGlyph}>[AI]</Text>}
                  label="AI Vocab"
                  ai
                />
              )}
              {isImage && (
                <ListRow
                  testID="msg-list-extracttext"
                  onPress={() => act("extractText")}
                  left={<Ionicons name="scan-outline" size={19} color={INK} />}
                  label="Extract text & translate"
                  ai
                />
              )}
              {isVoice && (
                <ListRow
                  testID="msg-list-transcription"
                  onPress={() => act("transcription")}
                  left={
                    <MaterialCommunityIcons
                      name="text"
                      size={19}
                      color={INK}
                    />
                  }
                  label="Transcription"
                />
              )}

              <View style={styles.listDivider} />

              {isVoice && (
                <ListRow
                  testID="msg-list-share"
                  onPress={() => act("share")}
                  left={<Ionicons name="arrow-redo-outline" size={19} color={INK} />}
                  label="Share"
                />
              )}
              {mine && !isImage && (
                <ListRow
                  testID="msg-list-recall"
                  onPress={() => act("recall")}
                  left={<Ionicons name="arrow-undo-outline" size={19} color={INK} />}
                  label="Recall"
                />
              )}
              {!isImage && (
                <ListRow
                  testID="msg-list-pin"
                  onPress={() => act("pin")}
                  left={
                    <MaterialCommunityIcons
                      name={pinned ? "pin" : "pin-outline"}
                      size={19}
                      color={pinned ? ACCENT : INK}
                    />
                  }
                  label={pinned ? "Unpin" : "Pin"}
                  active={pinned}
                />
              )}
              <ListRow
                testID="msg-list-multi"
                onPress={() => act("multiSelect")}
                left={
                  <MaterialCommunityIcons
                    name="format-list-checks"
                    size={19}
                    color={INK}
                  />
                }
                label="Multi-select"
              />
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.10)",
  },
  highlightPill: {
    position: "absolute",
    backgroundColor: colors.bubbleMine,
    borderRadius: 18,
    paddingVertical: 9,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  highlightText: {
    fontFamily: fonts.text,
    color: colors.onBubbleMine,
    lineHeight: undefined,
  },
  pillDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand,
  },
  pillDotStart: {
    left: -3,
    top: -3,
  },
  pillDotEnd: {
    right: -3,
    bottom: -3,
  },
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
  roundCircleActive: {
    backgroundColor: colors.brandTertiary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginTop: 10,
    marginBottom: 2,
    marginHorizontal: 8,
  },
  listDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginVertical: 4,
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
  listRowPressed: {
    backgroundColor: colors.surfaceSecondary,
  },
  listIcon: {
    width: 26,
    alignItems: "center",
  },
  listLabel: {
    fontFamily: fonts.textSemi,
    fontSize: 16,
    color: colors.onSurface,
  },
  glyph: {
    fontFamily: fonts.textBold,
    fontSize: 15,
    color: colors.onSurface,
  },
  aiGlyph: {
    fontFamily: fonts.textBold,
    fontSize: 13.5,
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  abc: {
    fontFamily: fonts.textBold,
    fontSize: 13,
    color: colors.onSurface,
  },
  aiBadgeText: {
    marginLeft: 4,
    marginTop: -8,
    fontFamily: fonts.textBold,
    fontSize: 10,
    color: colors.brand,
    letterSpacing: 0.4,
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
  voiceAffordance: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  voiceAffordanceSup: {
    fontFamily: fonts.textBold,
    fontSize: 9,
    color: colors.onSurface,
    marginLeft: -2,
    marginTop: -8,
  },
});
