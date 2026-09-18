/**
 * PartnerCard — the Connect-style partner profile card, shared between the
 * Connect tab and Custom Search results so both lists look identical.
 *
 * Layout: avatar column (flag, online/boost state) · body (name + VIP,
 * language codes with proficiency dots, bio, smart tags) · message button.
 */

import { Ionicons } from "@/src/ui/icons";
import dayjs from "dayjs";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ProfileAvatar } from "@/src/components/ProfileAvatar";
import { VipBadge } from "@/src/components/Badges";
import { PROFICIENCY_LEVELS } from "@/src/constants/languages";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { User } from "@/src/utils/api";

interface Props {
  item: User;
  me: User | null;
  onPress: () => void;
  onMessage: () => void;
  testIDPrefix?: string;
}

const ProfDots = ({
  level,
  styles,
}: {
  level?: string | null;
  styles: ReturnType<typeof makeStyles>;
}) => {
  const idx = level ? PROFICIENCY_LEVELS.indexOf(level) : -1;
  const filled = idx >= 0 ? idx + 1 : 1;
  return (
    <View style={styles.dotsRow}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={[styles.dot, i < filled && styles.dotFilled]} />
      ))}
    </View>
  );
};

export const PartnerCard: React.FC<Props> = ({
  item,
  me,
  onPress,
  onMessage,
  testIDPrefix = "partner",
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const myLearning = (
    me?.learning_languages?.length
      ? me.learning_languages
      : me?.learning_language
        ? [me.learning_language]
        : []
  ) as string[];

  const learning = (
    item.learning_languages?.length
      ? item.learning_languages
      : item.learning_language
        ? [item.learning_language]
        : []
  ).slice(0, 3);

  const isNew =
    item.created_at && dayjs().diff(dayjs(item.created_at), "day") < 7;
  const tags: { label: string; kind: "new" | "active" | "neutral" }[] = [];
  // Perfect match: they natively speak what I learn & learn my language.
  const teachesMe =
    !!item.native_language && myLearning.includes(item.native_language);
  const learnsMine =
    !!me?.native_language && learning.includes(me.native_language);
  if (teachesMe && learnsMine)
    tags.push({ label: "Perfect match", kind: "new" });
  if (isNew) tags.push({ label: "New", kind: "new" });
  if (item.is_online) tags.push({ label: "Very active", kind: "active" });
  const sharedInterests = (item.interests || []).filter((i) =>
    (me?.interests || []).includes(i),
  );
  if (sharedInterests.length > 0)
    tags.push({ label: "Similar interests", kind: "active" });
  if (me?.age && item.age && Math.abs(me.age - item.age) <= 5)
    tags.push({ label: "Similar age", kind: "active" });
  if (me?.country && item.country && me.country === item.country)
    tags.push({ label: "Nearby", kind: "neutral" });
  if (item.mbti) tags.push({ label: item.mbti, kind: "neutral" });
  if ((item.streak_count || 0) >= 3)
    tags.push({ label: "Serious learner", kind: "neutral" });
  // Guarantee at least 2 varied tags per card.
  if (
    tags.length < 2 &&
    sharedInterests.length === 0 &&
    (item.interests || []).length > 0
  )
    tags.push({ label: `Loves ${item.interests![0]}`, kind: "neutral" });
  if (tags.length < 2)
    tags.push({ label: "Language exchange", kind: "neutral" });
  const shownTags = tags.slice(0, 3);

  const subtitle =
    item.bio?.trim() ||
    "Say hi first—don't miss the chance to meet a new language partner!";

  return (
    <Pressable
      testID={`${testIDPrefix}-card-${item.id}`}
      style={styles.card}
      onPress={onPress}
    >
      <View style={styles.avatarCol}>
        <ProfileAvatar user={item} testID={`${testIDPrefix}-avatar-${item.id}`} />
        {item.boosted ? (
          <View
            style={styles.activeRow}
            testID={`${testIDPrefix}-boosted-${item.id}`}
          >
            <Ionicons name="flash" size={12} color="#F5A623" />
            <Text
              style={[styles.activeText, { color: "#F5A623" }]}
              numberOfLines={1}
            >
              Boosted
            </Text>
          </View>
        ) : (
          <View style={styles.activeRow}>
            <View
              style={[
                styles.activeDot,
                {
                  backgroundColor: item.is_online
                    ? "#22C55E"
                    : colors.borderStrong,
                },
              ]}
            />
            <Text style={styles.activeText} numberOfLines={1}>
              {item.is_online ? "Active now" : "Recently"}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.is_vip && <VipBadge small tier={item.vip_tier} />}
          {item.paid_practice && (
            <View style={styles.rateBadge} testID={`${testIDPrefix}-rate-${item.id}`}>
              <Ionicons name="logo-usd" size={10} color="#B45309" />
              <Text style={styles.rateBadgeText}>
                {item.practice_rate ?? 50}/day
              </Text>
            </View>
          )}
        </View>

        <View style={styles.langRow}>
          <View style={styles.langItem}>
            <Text style={styles.langCode}>
              {(item.native_language || "").toUpperCase()}
            </Text>
            <View style={styles.langBar} />
          </View>
          {(item.teach_languages || []).slice(0, 2).map((c) => (
            <View key={c} style={[styles.langItem, { marginLeft: 7 }]}>
              <Text style={styles.langCode}>{c.toUpperCase()}</Text>
              <View style={styles.langBar} />
            </View>
          ))}
          <Ionicons
            name="swap-horizontal"
            size={12}
            color={colors.onSurfaceSecondary}
            style={{ marginHorizontal: 4 }}
          />
          {learning.map((c, i) => (
            <View key={c} style={[styles.langItem, { marginRight: 7 }]}>
              <Text style={styles.langCode}>{c.toUpperCase()}</Text>
              <ProfDots
                level={
                  item.proficiencies?.[c] || (i === 0 ? item.proficiency : null)
                }
                styles={styles}
              />
            </View>
          ))}
        </View>

        <Text style={styles.cardSub} numberOfLines={2}>
          {subtitle}
        </Text>

        {shownTags.length > 0 && (
          <View style={styles.tagRow}>
            {shownTags.map((t) => (
              <View
                key={t.label}
                style={[
                  styles.tag,
                  t.kind === "new" && styles.tagNew,
                  t.kind === "active" && styles.tagActive,
                ]}
              >
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[
                    styles.tagText,
                    t.kind === "new" && styles.tagTextNew,
                    t.kind === "active" && styles.tagTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {item.paid_practice ? (
        <Pressable
          testID={`${testIDPrefix}-message-btn-${item.id}`}
          style={[styles.waveBtn, { backgroundColor: "#F59E0B" }]}
          onPress={onMessage}
        >
          <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
        </Pressable>
      ) : (
        <Pressable
          testID={`${testIDPrefix}-message-btn-${item.id}`}
          style={[styles.waveBtn, item.boosted && { backgroundColor: "#F5A623" }]}
          onPress={onMessage}
        >
          <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
        </Pressable>
      )}
    </Pressable>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.md,
    },
    avatarCol: {
      alignItems: "center",
      width: 66,
      gap: 4,
    },
    activeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },
    activeDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
    },
    activeText: {
      fontFamily: fonts.text,
      fontSize: 10,
      color: colors.onSurfaceSecondary,
    },
    cardBody: {
      flex: 1,
      gap: 5,
    },
    cardTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    cardName: {
      fontFamily: fonts.display,
      fontSize: 18,
      color: colors.onSurface,
      flexShrink: 1,
    },
    rateBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      backgroundColor: "#FEF3C7",
      borderRadius: radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    rateBadgeText: {
      fontFamily: fonts.textBold,
      fontSize: 10,
      color: "#B45309",
    },
    langRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    langItem: {
      alignItems: "flex-start",
    },
    // Compact: 3 selected languages must fit comfortably on one line.
    langCode: {
      fontFamily: fonts.textBold,
      fontSize: 9,
      letterSpacing: 0.2,
      color: colors.onSurface,
    },
    langBar: {
      width: "100%",
      height: 2.5,
      borderRadius: 2,
      backgroundColor: colors.success,
      marginTop: 2,
    },
    dotsRow: {
      flexDirection: "row",
      gap: 2,
      marginTop: 3,
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.surfaceTertiary,
    },
    dotFilled: {
      backgroundColor: colors.brand,
    },
    cardSub: {
      fontFamily: fonts.text,
      fontSize: 13,
      lineHeight: 19,
      color: colors.onSurfaceSecondary,
    },
    tagRow: {
      flexDirection: "row",
      alignItems: "center",
      // Single line only — long tags shrink and truncate with "…" instead
      // of wrapping onto a second row.
      flexWrap: "nowrap",
      overflow: "hidden",
      gap: spacing.sm,
      marginTop: 2,
    },
    tag: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm + 1,
      paddingVertical: 2.5,
      flexShrink: 1,
    },
    tagNew: {
      backgroundColor: "#CCFBF1",
    },
    tagActive: {
      backgroundColor: "#FFEDD5",
    },
    // Compact tag text so all three tags sit neatly on one line.
    tagText: {
      fontFamily: fonts.textSemi,
      fontSize: 10.5,
      color: colors.onSurfaceSecondary,
    },
    tagTextNew: {
      color: "#0A6B9E",
    },
    tagTextActive: {
      color: "#EA580C",
    },
    waveBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 5,
      marginLeft: -4,
    },
  });
