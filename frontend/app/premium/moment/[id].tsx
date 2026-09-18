import { Ionicons } from "@/src/ui/icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "@/src/components/layout/KeyboardAvoidingView";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { Avatar } from "@/src/components/Avatar";
import { useAuth } from "@/src/context/AuthContext";
import { fonts } from "@/src/theme";
import { api, Moment, MomentComment } from "@/src/utils/api";
import { timeAgo } from "@/src/utils/time";
import { premiumColors, premiumRadius } from "@/src/premium/theme";

/**
 * Premium version of the moment detail page. Same layout as the main app's
 * `/moment/[id]` but rendered in the royal-purple + gold palette so it feels
 * cohesive inside the Premium Club stack. Uses the shared /moments backend
 * endpoints — posts and comments are the same DB rows; only the UI differs.
 */
export default function PremiumMomentDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [moment, setMoment] = useState<Moment | null>(null);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<MomentComment | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.get<Moment>(`/moments/${id}`);
      setMoment(data);
    } catch {
      // fail silently — render empty state
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Wait until auth is restored (the moments endpoint requires a token), so
    // a cold-start / deep-link into this screen doesn't show "not found".
    if (!user) return;
    load();
  }, [load, user]);

  const toggleLike = async () => {
    if (!moment) return;
    // optimistic UI
    setMoment({
      ...moment,
      liked_by_me: !moment.liked_by_me,
      like_count: moment.like_count + (moment.liked_by_me ? -1 : 1),
    });
    try {
      await api.post(`/moments/${moment.id}/like`);
    } catch {
      load();
    }
  };

  const submitComment = async () => {
    const t = comment.trim();
    if (!t || !moment) return;
    setPosting(true);
    try {
      await api.post(`/moments/${moment.id}/comments`, {
        text: t,
        reply_to: replyTo?.id,
      });
      setComment("");
      setReplyTo(null);
      load();
    } catch {
      // keep input for retry
    } finally {
      setPosting(false);
    }
  };

  const vote = async (optionIndex: number) => {
    if (!moment) return;
    try {
      await api.post(`/moments/${moment.id}/vote`, { option_index: optionIndex });
      load();
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <View style={styles.center}>
          <ActivityIndicator color={premiumColors.gold} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!moment) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <PremiumTopBar router={router} title="Moment" />
        <View style={styles.center}>
          <Ionicons name="cloud-offline" size={40} color={premiumColors.onSurfaceTertiary} />
          <Text style={styles.emptyText}>Moment not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="premium-moment-detail">
      <PremiumTopBar router={router} title="Moment" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "web" ? undefined : "translate-with-padding"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {/* Author card */}
          <View style={styles.authorRow}>
            <Avatar
              name={moment.author?.name}
              url={moment.author?.avatar_url ?? undefined}
              size={44}
              frame={moment.author?.active_frame}
            />
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.authorName}>{moment.author?.name}</Text>
                {moment.author?.is_vip && (
                  <View style={styles.vipBadge}>
                    <Ionicons name="diamond" size={9} color={premiumColors.onGold} />
                    <Text style={styles.vipText}>PREMIUM</Text>
                  </View>
                )}
              </View>
              <Text style={styles.time}>{timeAgo(moment.created_at)}</Text>
            </View>
          </View>

          {/* Content */}
          {moment.text ? <Text style={styles.text}>{moment.text}</Text> : null}

          {moment.image_url ? (
            <Image source={{ uri: moment.image_url }} style={styles.photo} />
          ) : null}

          {/* Poll */}
          {moment.poll && moment.poll.options?.length > 0 && (
            <View style={styles.pollCard}>
              {moment.poll.question ? (
                <Text style={styles.pollQ}>{moment.poll.question}</Text>
              ) : null}
              {moment.poll.options.map((opt, i) => {
                const total = moment.poll?.total_votes ?? 0;
                const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
                const mine = moment.poll?.my_vote === i;
                return (
                  <Pressable
                    key={i}
                    testID={`premium-poll-opt-${i}`}
                    onPress={() => vote(i)}
                    style={[
                      styles.pollOpt,
                      mine && { borderColor: premiumColors.gold },
                    ]}
                  >
                    <View
                      style={[
                        styles.pollFill,
                        { width: `${pct}%`, backgroundColor: mine ? premiumColors.gold + "33" : premiumColors.surfaceHigh },
                      ]}
                    />
                    <View style={styles.pollLabelRow}>
                      <Text style={styles.pollLabel}>{opt.text}</Text>
                      <Text style={styles.pollPct}>{pct}%</Text>
                    </View>
                  </Pressable>
                );
              })}
              <Text style={styles.pollFoot}>
                {moment.poll.total_votes} votes
              </Text>
            </View>
          )}

          {/* Tags */}
          {moment.tags && moment.tags.length > 0 && (
            <View style={styles.tagRow}>
              {moment.tags.map((t) => (
                <View key={t} style={styles.tag}>
                  <Text style={styles.tagText}>#{t}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              testID="premium-moment-like"
              onPress={toggleLike}
              style={styles.actionBtn}
              hitSlop={6}
            >
              <Ionicons
                name={moment.liked_by_me ? "heart" : "heart-outline"}
                size={22}
                color={moment.liked_by_me ? premiumColors.gold : premiumColors.onSurfaceSecondary}
              />
              <Text
                style={[
                  styles.actionText,
                  moment.liked_by_me && { color: premiumColors.gold },
                ]}
              >
                {moment.like_count}
              </Text>
            </Pressable>
            <View style={styles.actionBtn}>
              <Ionicons name="chatbubble-outline" size={20} color={premiumColors.onSurfaceSecondary} />
              <Text style={styles.actionText}>{moment.comment_count}</Text>
            </View>
          </View>

          {/* Comments list */}
          <Text style={styles.section}>Comments</Text>
          {moment.comments && moment.comments.length > 0 ? (
            moment.comments.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setReplyTo(c)}
                style={styles.commentRow}
                testID={`premium-comment-${c.id}`}
              >
                <Avatar
                  name={c.author?.name}
                  url={c.author?.avatar_url ?? undefined}
                  size={32}
                  frame={c.author?.active_frame}
                />
                <View style={{ flex: 1 }}>
                  <View style={styles.commentHead}>
                    <Text style={styles.commentAuthor}>{c.author?.name}</Text>
                    {c.author?.is_vip && (
                      <Ionicons name="diamond" size={10} color={premiumColors.gold} />
                    )}
                    <Text style={styles.commentTime}>{timeAgo(c.created_at)}</Text>
                  </View>
                  {c.reply_to_author ? (
                    <Text style={styles.replyLabel}>
                      Reply to <Text style={{ color: premiumColors.gold }}>{c.reply_to_author}</Text>
                    </Text>
                  ) : null}
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              </Pressable>
            ))
          ) : (
            <Text style={styles.emptyComments}>Be the first to comment.</Text>
          )}
        </ScrollView>

        {/* Sticky compose bar */}
        <View style={styles.composeBar}>
          {replyTo && (
            <View style={styles.replyBanner}>
              <Text style={styles.replyBannerText}>
                Replying to <Text style={{ color: premiumColors.gold }}>{replyTo.author?.name}</Text>
              </Text>
              <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
                <Ionicons name="close" size={16} color={premiumColors.onSurfaceSecondary} />
              </Pressable>
            </View>
          )}
          <View style={styles.composeRow}>
            <TextInput
              testID="premium-comment-input"
              value={comment}
              onChangeText={setComment}
              placeholder={replyTo ? `Reply to ${replyTo.author?.name}…` : "Add a comment…"}
              placeholderTextColor={premiumColors.onSurfaceTertiary}
              style={styles.composeInput}
              multiline
            />
            <Pressable
              testID="premium-comment-send"
              onPress={submitComment}
              disabled={!comment.trim() || posting}
              style={[styles.sendBtn, (!comment.trim() || posting) && { opacity: 0.4 }]}
            >
              <Ionicons name="send" size={16} color={premiumColors.onGold} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PremiumTopBar = ({
  router,
  title,
}: {
  router: ReturnType<typeof useRouter>;
  title: string;
}) => (
  <View style={styles.topBar}>
    <Pressable
      testID="premium-moment-back"
      onPress={() => router.back()}
      style={styles.iconChip}
      hitSlop={8}
    >
      <Ionicons name="chevron-back" size={20} color={premiumColors.gold} />
    </Pressable>
    <View style={{ flex: 1 }}>
      <Text style={styles.brand}>PREMIUM CLUB</Text>
      <Text style={styles.topTitle}>{title}</Text>
    </View>
    <View style={{ width: 40 }} />
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: premiumColors.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: premiumColors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontFamily: fonts.textBold,
    fontSize: 10,
    letterSpacing: 2,
    color: premiumColors.gold,
  },
  topTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: premiumColors.onSurface,
    marginTop: 2,
  },
  body: { padding: 20, gap: 14, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyText: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: premiumColors.onSurfaceSecondary,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  authorName: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: premiumColors.onSurface,
  },
  vipBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: premiumColors.gold,
    borderRadius: premiumRadius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  vipText: {
    fontFamily: fonts.textBold,
    fontSize: 8,
    color: premiumColors.onGold,
    letterSpacing: 0.5,
  },
  time: {
    fontFamily: fonts.text,
    fontSize: 11,
    color: premiumColors.onSurfaceTertiary,
    marginTop: 2,
  },
  text: {
    fontFamily: fonts.text,
    fontSize: 15,
    color: premiumColors.onSurface,
    lineHeight: 22,
  },
  photo: {
    width: "100%",
    height: 260,
    borderRadius: premiumRadius.lg,
    backgroundColor: premiumColors.surfaceHigh,
  },
  pollCard: {
    backgroundColor: premiumColors.surfaceRaised,
    borderRadius: premiumRadius.lg,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: premiumColors.border,
  },
  pollQ: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    color: premiumColors.onSurface,
  },
  pollOpt: {
    height: 42,
    borderRadius: premiumRadius.md,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1.5,
    borderColor: "transparent",
    backgroundColor: premiumColors.surface,
    justifyContent: "center",
  },
  pollFill: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
  },
  pollLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  pollLabel: {
    fontFamily: fonts.textBold,
    fontSize: 13,
    color: premiumColors.onSurface,
  },
  pollPct: {
    fontFamily: fonts.textBold,
    fontSize: 12,
    color: premiumColors.gold,
  },
  pollFoot: {
    fontFamily: fonts.textSemi,
    fontSize: 11,
    color: premiumColors.onSurfaceTertiary,
    textAlign: "right",
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    backgroundColor: premiumColors.surfaceHigh,
    borderRadius: premiumRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontFamily: fonts.textBold,
    fontSize: 11,
    color: premiumColors.gold,
  },
  actions: {
    flexDirection: "row",
    gap: 20,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: premiumColors.divider,
    marginTop: 4,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionText: {
    fontFamily: fonts.textBold,
    fontSize: 13,
    color: premiumColors.onSurfaceSecondary,
  },
  section: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: premiumColors.onSurface,
    marginTop: 10,
  },
  commentRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
  },
  commentHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  commentAuthor: {
    fontFamily: fonts.textBold,
    fontSize: 13,
    color: premiumColors.onSurface,
  },
  commentTime: {
    fontFamily: fonts.text,
    fontSize: 11,
    color: premiumColors.onSurfaceTertiary,
    marginLeft: "auto",
  },
  replyLabel: {
    fontFamily: fonts.textSemi,
    fontSize: 11,
    color: premiumColors.onSurfaceSecondary,
    marginTop: 2,
  },
  commentText: {
    fontFamily: fonts.text,
    fontSize: 13,
    color: premiumColors.onSurface,
    marginTop: 2,
    lineHeight: 19,
  },
  emptyComments: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: premiumColors.onSurfaceTertiary,
    textAlign: "center",
    paddingVertical: 20,
  },
  composeBar: {
    backgroundColor: premiumColors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: premiumColors.border,
    padding: 10,
    paddingBottom: 10,
  },
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
    borderRadius: 12,
    backgroundColor: premiumColors.surfaceRaised,
  },
  replyBannerText: {
    fontFamily: fonts.textSemi,
    fontSize: 12,
    color: premiumColors.onSurfaceSecondary,
  },
  composeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  composeInput: {
    flex: 1,
    backgroundColor: premiumColors.surfaceRaised,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 40,
    maxHeight: 110,
    fontFamily: fonts.text,
    fontSize: 14,
    color: premiumColors.onSurface,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: premiumColors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
});
