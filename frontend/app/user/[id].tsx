import { Ionicons } from "@/src/ui/icons";
import { genderColors } from "@/src/theme";
import dayjs from "dayjs";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/src/components/Avatar";
import { SpeakingBars } from "@/src/components/SpeakingBars";
import { BackButton } from "@/src/components/BackButton";
import { VipBadge } from "@/src/components/Badges";
import { FlagIcon } from "@/src/components/FlagIcon";
import { LikersRow } from "@/src/components/LikersRow";
import { RoomMomentCard } from "@/src/components/RoomMomentCard";
import { VoiceBubble } from "@/src/components/VoiceBubble";
import { countryToCode } from "@/src/constants/countries";
import { PROFICIENCY_LEVELS, langName } from "@/src/constants/languages";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, shadow, spacing, ThemeColors } from "@/src/theme";
import { api, assetUrl, Conversation, Moment, User } from "@/src/utils/api";
import { timeAgo } from "@/src/utils/time";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
type TabKey = "about" | "moments" | "achievements";

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: me } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);
  const [tab, setTab] = useState<TabKey>("about");
  const [momentsCount, setMomentsCount] = useState(0);
  const [moments, setMoments] = useState<Moment[] | null>(null);
  const [liked, setLiked] = useState(false);
  const [postTranslations, setPostTranslations] = useState<Record<string, string>>({});
  const [translatingPost, setTranslatingPost] = useState<string | null>(null);
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const isSelf = !!me && me.id === id;

  useEffect(() => {
    if (!me) return;
    let active = true;
    setLoading(true);
    api
      .get<User>(`/users/${id}`)
      .then((p) => {
        if (active) setProfile(p);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    api
      .get<{ count: number }>(`/moments/user/${id}/count`)
      .then((d) => active && setMomentsCount(d.count))
      .catch(() => {});
    api
      .get<Moment[]>(`/moments?user_id=${id}`)
      .then((d) => active && setMoments(d))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id, me]);

  const message = async () => {
    try {
      const conv = await api.post<Conversation>("/chats", { partner_id: id });
      router.push(`/chat/${conv.id}`);
    } catch (e) {
      Alert.alert(
        "Message limit",
        e instanceof Error ? e.message : "Could not start the chat.",
      );
    }
  };

  const toggleFollow = async () => {
    if (followBusy) return;
    setFollowBusy(true);
    try {
      const res = await api.post<{ following: boolean; followers_count: number }>(
        `/users/${id}/follow`,
      );
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              is_following: res.following,
              followers_count: res.followers_count,
            }
          : prev,
      );
    } catch {
      // retry on next tap
    } finally {
      setFollowBusy(false);
    }
  };

  const toggleMomentLike = async (moment: Moment) => {
    setMoments((prev) =>
      (prev || []).map((m) =>
        m.id === moment.id
          ? {
              ...m,
              liked_by_me: !m.liked_by_me,
              like_count: m.like_count + (m.liked_by_me ? -1 : 1),
            }
          : m,
      ),
    );
    try {
      await api.post(`/moments/${moment.id}/like`);
    } catch {
      // refetch on failure
      api
        .get<Moment[]>(`/moments?user_id=${id}`)
        .then((d) => setMoments(d))
        .catch(() => {});
    }
  };

  const translatePost = async (moment: Moment) => {
    if (postTranslations[moment.id]) {
      setPostTranslations((prev) => {
        const next = { ...prev };
        delete next[moment.id];
        return next;
      });
      return;
    }
    if (!moment.text || translatingPost) return;
    setTranslatingPost(moment.id);
    try {
      const result = await api.post<{ translated: string }>("/ai/translate", {
        text: moment.text,
        target_language: me?.native_language || "en",
      });
      setPostTranslations((prev) => ({ ...prev, [moment.id]: result.translated }));
    } catch {
      // silent — user can retry
    } finally {
      setTranslatingPost(null);
    }
  };

  const joinRoomFromMoment = async (roomId: string) => {
    try {
      await api.post(`/rooms/${roomId}/join`);
      router.push(`/room/${roomId}`);
    } catch (e) {
      Alert.alert(
        "Voice room",
        e instanceof Error ? e.message : "Could not join this room.",
      );
    }
  };

  const openMenu = () => {
    if (!profile) return;
    Alert.alert(profile.name, undefined, [
      {
        text: "Hide their Moments",
        onPress: () => api.post(`/users/${id}/hide-moments`).catch(() => {}),
      },
      {
        text: "Block user",
        style: "destructive",
        onPress: async () => {
          try {
            await api.post(`/users/${id}/block`);
            router.back();
          } catch {
            Alert.alert("Error", "Could not block this user.");
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  if (loading || !profile) {
    return (
      <View style={[styles.container, styles.center]} testID="user-profile-screen">
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  const daysJoined = profile.created_at
    ? Math.max(1, dayjs().diff(dayjs(profile.created_at), "day") + 1)
    : 1;
  const profIdx = profile.proficiency
    ? PROFICIENCY_LEVELS.indexOf(profile.proficiency)
    : -1;
  const dotsFilled = profIdx >= 0 ? profIdx + 1 : 0;
  const learningList = profile.learning_languages?.length
    ? profile.learning_languages
    : profile.learning_language
      ? [profile.learning_language]
      : [];

  const LangCol = ({
    code,
    accent,
    dots,
  }: {
    code?: string | null;
    accent?: boolean;
    dots?: number;
  }) => (
    <View style={styles.langCol}>
      <Text style={styles.langCode}>{(code || "").toUpperCase()}</Text>
      {accent ? <View style={styles.langAccent} /> : null}
      {typeof dots === "number" ? (
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, i < dots && styles.dotFilled]} />
          ))}
        </View>
      ) : null}
      <Text style={styles.langName}>{langName(code)}</Text>
    </View>
  );

  const personalInfo = [
    { icon: "happy" as IconName, label: "MBTI", value: profile.mbti },
    { icon: "water" as IconName, label: "Blood Type", value: profile.blood_type },
    { icon: "home" as IconName, label: "Hometown", value: profile.hometown },
    { icon: "briefcase" as IconName, label: "Occupation", value: profile.occupation },
    { icon: "school" as IconName, label: "School", value: profile.school },
    { icon: "airplane" as IconName, label: "Wants to visit", value: profile.places_to_go },
  ].filter((r) => !!r.value);

  return (
    <View style={styles.container} testID="user-profile-screen">
      {/* Fixed cover behind everything — content scrolls over it */}
      <View style={styles.coverFixed} pointerEvents="none">
        {profile.cover_url ? (
          <Image
            source={{ uri: assetUrl(profile.cover_url) || undefined }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        ) : (
          <LinearGradient
            colors={["#0E9AE0", "#0A6B9E"]}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={[StyleSheet.absoluteFill, styles.coverGlobe]}>
          <Ionicons name="earth" size={200} color="rgba(255,255,255,0.12)" />
        </View>
      </View>

      {/* Transparent floating header — sits on top of the fixed cover */}
      <SafeAreaView edges={["top"]} style={styles.coverBar} pointerEvents="box-none">
        <BackButton
          testID="user-profile-back-btn"
          variant="overlay"
        />
        {isSelf ? (
          <View style={styles.coverIconBtn} />
        ) : (
          <Pressable
            testID="user-menu-btn"
            style={styles.coverIconBtn}
            onPress={openMenu}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
          </Pressable>
        )}
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Transparent spacer that lets the cover show through at the top */}
        <View style={styles.coverSpacer} />

        {/* Content sheet slides up over the cover */}
        <View style={styles.contentSheet}>
          {/* Avatar + like + time */}
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrap}>
              <Avatar
                name={profile.name}
                url={profile.avatar_url}
                size={84}
                flagCode={countryToCode(profile.country)}
                frame={profile.active_frame}
                inVoiceRoom={!!profile.in_voice_room}
              />
            </View>
            <View style={styles.avatarRight}>
              <View style={styles.timePill}>
                <Text style={styles.timePillText}>{dayjs().format("h:mm A")}</Text>
              </View>
              <Pressable
                testID="user-like-pill"
                style={styles.likePill}
                onPress={() => setLiked((v) => !v)}
              >
                <Ionicons
                  name={liked ? "thumbs-up" : "thumbs-up-outline"}
                  size={18}
                  color={liked ? colors.brand : colors.onSurfaceSecondary}
                />
                <Text style={styles.likePillText}>{liked ? 1 : 0}</Text>
              </Pressable>
            </View>
          </View>

        <View style={styles.body}>
          {/* Name row */}
          <View style={styles.nameLine}>
            <Text style={styles.name} numberOfLines={1}>
              {profile.name}
            </Text>
            {!!profile.gender && <View style={[styles.genderPill, { backgroundColor: profile.gender === "female" ? genderColors.femaleBackground : genderColors.maleBackground }]}>
              <Ionicons
                name={profile.gender === "female" ? "female" : "male"}
                size={12}
                color="#FFFFFF"
              />
              {profile.age ? (
                <Text style={[styles.genderPillText, { color: profile.gender === "female" ? genderColors.female : genderColors.male }]}>{profile.age}</Text>
              ) : null}
            </View>}
            {profile.is_vip && <VipBadge tier={profile.vip_tier} />}
            <View style={{ flex: 1 }} />
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: profile.is_online ? "#22C55E" : colors.borderStrong },
                ]}
              />
              <Text style={styles.statusText}>
                {profile.is_online ? "Active now" : "Offline"}
              </Text>
            </View>
          </View>

          {/* Username */}
          {profile.username ? (
            <View style={styles.usernameRow} testID="user-username">
              <Text style={styles.username}>@{profile.username}</Text>
              <Ionicons
                name="copy-outline"
                size={13}
                color={colors.onSurfaceSecondary}
              />
            </View>
          ) : null}

          {/* Languages: native + extra teaching languages ⇄ learning */}
          <View style={styles.langRow}>
            <LangCol code={profile.native_language} accent />
            {(profile.teach_languages || []).slice(0, 2).map((c) => (
              <View key={c} style={{ marginLeft: spacing.md }}>
                <LangCol code={c} accent />
              </View>
            ))}
            <Ionicons
              name="swap-horizontal"
              size={16}
              color={colors.onSurfaceSecondary}
              style={{ marginHorizontal: spacing.md }}
            />
            {learningList.slice(0, 3).map((c, i) => (
              <View key={c} style={{ marginRight: spacing.md }}>
                <LangCol code={c} dots={i === 0 ? dotsFilled : 1} />
              </View>
            ))}
          </View>

          {/* Stats line */}
          <View style={styles.statLine}>
            <Text style={styles.statLineText}>
              <Text style={styles.statLineNum}>{profile.following_count ?? 0}</Text>{" "}
              Following
            </Text>
            <View style={styles.statDivider} />
            <Text style={styles.statLineText}>
              <Text style={styles.statLineNum}>{profile.followers_count ?? 0}</Text>{" "}
              Followers
            </Text>
            <View style={styles.statDivider} />
            <Text style={styles.statLineText}>
              <Text style={styles.statLineNum}>{daysJoined}</Text> Days here
            </Text>
          </View>

          {/* Live voice-room card — "Go Look" (HelloTalk style) */}
          {profile.in_voice_room ? (
            <View style={styles.liveRoomCard} testID="user-live-room-card">
              <View style={styles.liveRoomAvatarWrap}>
                <Avatar
                  name={profile.name}
                  url={profile.avatar_url}
                  size={44}
                  inVoiceRoom
                />
              </View>
              <View style={styles.liveRoomLangChip}>
                <Text style={styles.liveRoomLangText}>
                  {(profile.in_voice_room.language || profile.native_language || "EN").toUpperCase()}
                </Text>
              </View>
              <View style={{ marginLeft: 2 }}>
                <SpeakingBars color="#0E9AE0" />
              </View>
              <Text style={styles.liveRoomTitle} numberOfLines={1}>
                {profile.in_voice_room.title ||
                  profile.in_voice_room.name ||
                  "Live voice room"}
              </Text>
              <Pressable
                testID="user-go-look-btn"
                style={styles.goLookBtn}
                onPress={async () => {
                  const rid = profile.in_voice_room?.room_id;
                  if (!rid) return;
                  try {
                    await api.post(`/rooms/${rid}/join`);
                  } catch {
                    /* room may have ended; screen handles it */
                  }
                  router.push(`/room/${rid}`);
                }}
              >
                <Text style={styles.goLookText}>Go Look</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Bio */}
          <View style={styles.bioRow}>
            <Text style={styles.bio}>
              {profile.bio || "This partner hasn't written a bio yet."}
            </Text>
            <View style={styles.translateChip}>
              <Ionicons name="language" size={14} color={colors.brand} />
            </View>
          </View>

          {/* Voice introduction */}
          {profile.voice_bio_id ? (
            <View style={styles.voiceBioWrap} testID="profile-voice-bio">
              <VoiceBubble
                testID="profile-voice-bio-bubble"
                audioId={profile.voice_bio_id}
                durationMs={profile.voice_bio_duration_ms}
                mine={true}
              />
            </View>
          ) : null}

          {/* Tabs */}
          <View style={styles.tabsRow}>
            {(
              [
                { key: "about", label: "About Me" },
                { key: "moments", label: `Moments ${momentsCount}` },
                { key: "achievements", label: "Achievements" },
              ] as { key: TabKey; label: string }[]
            ).map((t) => (
              <Pressable
                key={t.key}
                testID={`user-tab-${t.key}`}
                onPress={() => setTab(t.key)}
                style={[styles.tabItem, tab === t.key && styles.tabItemActive]}
              >
                <Text
                  style={[styles.tabText, tab === t.key && styles.tabTextActive]}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Tab content */}
          {tab === "about" && (
            <>
              <View style={styles.infoCard}>
                <View style={styles.infoTopRow}>
                  <View style={styles.infoTopItem}>
                    <Ionicons name="calendar" size={16} color={colors.success} />
                    <Text style={styles.infoTopText}>{daysJoined} Days Joined</Text>
                  </View>
                  <View style={styles.infoTopItem}>
                    <Ionicons name="flame" size={16} color={colors.warning} />
                    <Text style={styles.infoTopText}>
                      {profile.streak_count ?? 0} Day Streak
                    </Text>
                  </View>
                </View>
                <View style={styles.infoStatsRow}>
                  {[
                    { icon: "flame" as IconName, color: colors.warning, value: profile.streak_count ?? 0, label: "Streak" },
                    { icon: "planet" as IconName, color: "#0E9AE0", value: momentsCount, label: "Moments" },
                    { icon: "people" as IconName, color: colors.brand, value: profile.followers_count ?? 0, label: "Followers" },
                    { icon: "person-add" as IconName, color: colors.success, value: profile.following_count ?? 0, label: "Following" },
                    { icon: "language" as IconName, color: "#06B6D4", value: learningList.length, label: "Learning" },
                    { icon: "ribbon" as IconName, color: colors.error, value: profile.is_vip ? 1 : 0, label: "Badges" },
                  ].map((s, i) => (
                    <View key={i} style={styles.infoStatCell}>
                      <Ionicons name={s.icon} size={19} color={s.color} />
                      <Text style={styles.infoStatValue}>{s.value}</Text>
                      <Text style={styles.infoStatLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {profile.interests && profile.interests.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Interests</Text>
                  <View style={styles.interestWrap}>
                    {profile.interests.map((i) => (
                      <View key={i} style={styles.interestChip}>
                        <Text style={styles.interestText}>{i}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {personalInfo.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Personal Info</Text>
                  {personalInfo.map((r, idx) => (
                    <View
                      key={r.label}
                      style={[
                        styles.piRow,
                        idx < personalInfo.length - 1 && styles.piBorder,
                      ]}
                    >
                      <Ionicons name={r.icon} size={18} color={colors.brand} />
                      <Text style={styles.piLabel}>{r.label}</Text>
                      <Text style={styles.piValue} numberOfLines={1}>
                        {r.value}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {tab === "moments" && (
            <View style={{ gap: spacing.md }}>
              <View style={styles.momentsAggRow}>
                <Text style={styles.aggText}>
                  <Text style={styles.aggNum}>
                    {(moments || []).reduce((s, m) => s + (m.like_count || 0), 0)}
                  </Text>{" "}
                  Like
                </Text>
                <Text style={styles.aggText}>
                  <Text style={styles.aggNum}>
                    {(moments || []).reduce(
                      (s, m) => s + (m.comment_count || 0),
                      0,
                    )}
                  </Text>{" "}
                  Comment
                </Text>
              </View>

              {moments === null ? (
                <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.lg }} />
              ) : moments.length === 0 ? (
                <View style={[styles.section, styles.emptyBox]}>
                  <Ionicons
                    name="planet-outline"
                    size={40}
                    color={colors.onSurfaceSecondary}
                  />
                  <Text style={styles.emptyText}>
                    {isSelf
                      ? "You haven't posted any moments yet"
                      : `${profile.name} hasn't posted any moments yet`}
                  </Text>
                </View>
              ) : (
                moments.map((m) => (
                  <Pressable
                    key={m.id}
                    testID={`moment-item-${m.id}`}
                    style={styles.momentCard}
                    onPress={() => router.push(`/moment/${m.id}`)}
                  >
                    <View style={styles.momentHead}>
                      <Avatar
                        name={profile.name}
                        url={profile.avatar_url}
                        size={42}
                        flagCode={countryToCode(profile.country)}
                        online={profile.is_online}
                        frame={profile.active_frame}
                      />
                      <View style={{ flex: 1 }}>
                        <View style={styles.momentNameRow}>
                          <Text style={styles.momentName}>{profile.name}</Text>
                          {profile.is_vip ? (
                            <VipBadge small tier={profile.vip_tier} />
                          ) : null}
                        </View>
                        <View style={styles.momentLangRow}>
                          <FlagIcon code={profile.native_language} size={13} />
                          <Ionicons
                            name="arrow-forward"
                            size={9}
                            color={colors.onSurfaceSecondary}
                          />
                          {learningList.slice(0, 3).map((c) => (
                            <FlagIcon key={c} code={c} size={13} />
                          ))}
                          <Text style={styles.momentDate}>
                            {" "}· {timeAgo(m.created_at)}
                          </Text>
                        </View>
                      </View>
                      {isSelf && (
                        <View style={styles.boostChip}>
                          <Ionicons name="rocket" size={13} color="#FFFFFF" />
                          <Text style={styles.boostText}>Boost</Text>
                        </View>
                      )}
                    </View>
                    {m.text ? (
                      <Text style={styles.momentText}>{m.text}</Text>
                    ) : null}
                    {postTranslations[m.id] ? (
                      <View style={styles.translationBlock}>
                        <Ionicons name="language" size={13} color={colors.brand} />
                        <Text style={styles.translationText}>
                          {postTranslations[m.id]}
                        </Text>
                      </View>
                    ) : null}
                    {m.room ? (
                      <RoomMomentCard
                        testID={`profile-moment-room-card-${m.id}`}
                        room={m.room}
                        onPress={() => joinRoomFromMoment(m.room!.id)}
                      />
                    ) : m.image_url ? (
                      <Image
                        source={{ uri: assetUrl(m.image_url) || undefined }}
                        style={styles.momentImg}
                        contentFit="cover"
                        transition={150}
                      />
                    ) : null}
                    <View style={styles.momentStats}>
                      <Pressable
                        testID={`profile-moment-like-${m.id}`}
                        style={styles.momentStat}
                        onPress={() => toggleMomentLike(m)}
                      >
                        <Ionicons
                          name={m.liked_by_me ? "heart" : "heart-outline"}
                          size={20}
                          color={m.liked_by_me ? colors.error : colors.onSurfaceSecondary}
                        />
                        <Text style={styles.momentStatText}>{m.like_count}</Text>
                      </Pressable>
                      <Pressable
                        testID={`profile-moment-comment-${m.id}`}
                        style={styles.momentStat}
                        onPress={() => router.push(`/moment/${m.id}`)}
                      >
                        <Ionicons
                          name="chatbubble-outline"
                          size={18}
                          color={colors.onSurfaceSecondary}
                        />
                        <Text style={styles.momentStatText}>
                          {m.comment_count}
                        </Text>
                      </Pressable>
                      {m.text ? (
                        <Pressable
                          testID={`profile-moment-translate-${m.id}`}
                          style={styles.momentStat}
                          onPress={() => translatePost(m)}
                        >
                          {translatingPost === m.id ? (
                            <ActivityIndicator size="small" color={colors.brand} />
                          ) : (
                            <Ionicons
                              name="language"
                              size={18}
                              color={
                                postTranslations[m.id]
                                  ? colors.brand
                                  : colors.onSurfaceSecondary
                              }
                            />
                          )}
                        </Pressable>
                      ) : null}
                    </View>
                    <LikersRow
                      momentId={m.id}
                      likeCount={m.like_count}
                      likers={m.likers}
                    />
                  </Pressable>
                ))
              )}
            </View>
          )}

          {tab === "achievements" && (
            <View style={styles.achRow}>
              <View style={styles.achCard}>
                <Ionicons name="flame" size={22} color={colors.warning} />
                <Text style={styles.achValue}>{profile.streak_count ?? 0}</Text>
                <Text style={styles.achLabel}>Day Streak</Text>
              </View>
              <View style={styles.achCard}>
                <Ionicons name="calendar" size={22} color={colors.success} />
                <Text style={styles.achValue}>{daysJoined}</Text>
                <Text style={styles.achLabel}>Days Member</Text>
              </View>
              <View style={styles.achCard}>
                <Ionicons name="diamond" size={22} color={colors.brand} />
                <Text style={styles.achValue}>{profile.is_vip ? "VIP" : "Free"}</Text>
                <Text style={styles.achLabel}>Status</Text>
              </View>
            </View>
          )}
        </View>
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {isSelf ? (
          <Pressable
            testID="post-moment-btn"
            style={styles.postMomentBtn}
            onPress={() => router.push("/(tabs)/moments")}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.postMomentText}>Post Moment</Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              testID="user-profile-follow-btn"
              style={[styles.followBtn, profile.is_following && styles.followBtnActive]}
              onPress={toggleFollow}
              disabled={followBusy}
            >
              {followBusy ? (
                <ActivityIndicator size="small" color={colors.brand} />
              ) : (
                <Text style={styles.followText}>
                  {profile.is_following ? "Following" : "Follow"}
                </Text>
              )}
            </Pressable>
            <Pressable
              testID="user-profile-message-btn"
              style={styles.sayHiBtn}
              onPress={message}
            >
              <Text style={styles.sayHiText}>Say Hi</Text>
            </Pressable>
            <Pressable
              testID="user-gift-btn"
              style={styles.giftBtn}
              onPress={() => Alert.alert("Gifts", "Sending gifts is coming soon!")}
            >
              <Ionicons name="gift" size={20} color="#FFFFFF" />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    center: {
      alignItems: "center",
      justifyContent: "center",
    },
    coverFixed: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 200,
      backgroundColor: colors.brand,
      overflow: "hidden",
    },
    coverSpacer: {
      // Transparent gap that lets the fixed cover show through. Slightly less
      // than the cover so the content sheet's rounded top overlaps the cover
      // by 40px — that visual "sliding up" effect.
      height: 160,
      backgroundColor: "transparent",
    },
    contentSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      minHeight: 600,
    },
    coverWrap: {
      height: 176,
      backgroundColor: colors.brand,
      overflow: "hidden",
    },
    coverGlobe: {
      alignItems: "center",
      justifyContent: "center",
    },
    coverBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      zIndex: 5,
    },
    coverIconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.35)",
    },
    avatarRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      marginTop: -42,
    },
    avatarWrap: {
      borderWidth: 3,
      borderColor: colors.surface,
      borderRadius: 48,
    },
    avatarRight: {
      alignItems: "flex-end",
      gap: spacing.sm,
      marginTop: 46,
    },
    timePill: {
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
    },
    timePillText: {
      fontFamily: fonts.textBold,
      fontSize: 13,
      color: colors.onBrand,
    },
    likePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
    },
    likePillText: {
      fontFamily: fonts.textBold,
      fontSize: 14,
      color: colors.onSurface,
    },
    body: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      gap: spacing.md,
    },
    nameLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    name: {
      fontFamily: fonts.display,
      fontSize: 24,
      letterSpacing: -0.3,
      color: colors.onSurface,
      flexShrink: 1,
    },
    genderPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      backgroundColor: "#3B82F6",
      borderRadius: radius.pill,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    genderPillText: {
      fontFamily: fonts.textBold,
      fontSize: 12,
      color: "#FFFFFF",
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusText: {
      fontFamily: fonts.textSemi,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
    },
    usernameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginTop: -spacing.xs,
    },
    username: {
      fontFamily: fonts.textSemi,
      fontSize: 14,
      color: colors.onSurfaceSecondary,
    },
    langRow: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    langCol: {
      alignItems: "flex-start",
    },
    langCode: {
      fontFamily: fonts.textBold,
      fontSize: 11.5,
      color: colors.onSurface,
      letterSpacing: 0.2,
    },
    langAccent: {
      width: "100%",
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.success,
      marginTop: 2,
    },
    dotsRow: {
      flexDirection: "row",
      gap: 3,
      marginTop: 4,
    },
    dot: {
      width: 4.5,
      height: 4.5,
      borderRadius: 2.25,
      backgroundColor: colors.surfaceTertiary,
    },
    dotFilled: {
      backgroundColor: colors.brand,
    },
    langName: {
      fontFamily: fonts.textSemi,
      fontSize: 9.5,
      color: colors.onSurfaceSecondary,
      marginTop: 3,
    },
    statLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      flexWrap: "wrap",
    },
    statDivider: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: colors.borderStrong,
    },
    statLineText: {
      fontFamily: fonts.textSemi,
      fontSize: 13.5,
      color: colors.onSurfaceSecondary,
    },
    statLineNum: {
      fontFamily: fonts.textBold,
      fontSize: 14.5,
      color: colors.onSurface,
    },
    liveRoomCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.brandTertiary,
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginTop: spacing.md,
    },
    liveRoomAvatarWrap: {
      marginRight: 2,
    },
    liveRoomLangChip: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    liveRoomLangText: {
      fontFamily: fonts.textBold,
      fontSize: 11,
      color: colors.onSurface,
    },
    liveRoomTitle: {
      flex: 1,
      fontFamily: fonts.textSemi,
      fontSize: 14,
      color: colors.onSurface,
      textAlign: "right",
      marginRight: 4,
    },
    goLookBtn: {
      backgroundColor: colors.brand,
      borderRadius: 20,
      paddingHorizontal: 18,
      paddingVertical: 10,
    },
    goLookText: {
      fontFamily: fonts.textBold,
      fontSize: 14.5,
      color: colors.onBrand,
    },
    bioRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: spacing.sm,
    },
    bio: {
      flex: 1,
      fontFamily: fonts.text,
      fontSize: 15,
      lineHeight: 22,
      color: colors.onSurface,
    },
    translateChip: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.brandTertiary,
      alignItems: "center",
      justifyContent: "center",
    },
    voiceBioWrap: {
      backgroundColor: colors.bubbleMine,
      borderRadius: 22,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      alignSelf: "flex-start",
      minWidth: 210,
      marginTop: spacing.sm,
    },
    tabsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    tabItem: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
    },
    tabItemActive: {
      backgroundColor: colors.surfaceSecondary,
    },
    tabText: {
      fontFamily: fonts.textSemi,
      fontSize: 15,
      color: colors.onSurfaceSecondary,
    },
    tabTextActive: {
      fontFamily: fonts.textBold,
      color: colors.onSurface,
    },
    infoCard: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    infoTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderStrong,
    },
    infoTopItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    infoTopText: {
      fontFamily: fonts.textBold,
      fontSize: 14,
      color: colors.onSurface,
    },
    infoStatsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingTop: spacing.md,
    },
    infoStatCell: {
      alignItems: "center",
      gap: 3,
      flex: 1,
    },
    infoStatValue: {
      fontFamily: fonts.textBold,
      fontSize: 14,
      color: colors.onSurface,
    },
    infoStatLabel: {
      fontFamily: fonts.textSemi,
      fontSize: 9.5,
      color: colors.onSurfaceSecondary,
    },
    section: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    sectionTitle: {
      fontFamily: fonts.textBold,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    interestWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    interestChip: {
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
    },
    interestText: {
      fontFamily: fonts.textSemi,
      fontSize: 13,
      color: colors.onSurfaceTertiary,
    },
    piRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.md,
    },
    piBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderStrong,
    },
    piLabel: {
      fontFamily: fonts.textSemi,
      fontSize: 14,
      color: colors.onSurfaceSecondary,
      flex: 1,
    },
    piValue: {
      fontFamily: fonts.textBold,
      fontSize: 15,
      color: colors.onSurface,
      maxWidth: "55%",
    },
    emptyBox: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.xxl,
      gap: spacing.md,
    },
    emptyText: {
      fontFamily: fonts.text,
      fontSize: 14,
      color: colors.onSurfaceSecondary,
      textAlign: "center",
    },
    achRow: {
      flexDirection: "row",
      gap: spacing.md,
    },
    achCard: {
      flex: 1,
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
    },
    achValue: {
      fontFamily: fonts.display,
      fontSize: 18,
      color: colors.onSurface,
    },
    achLabel: {
      fontFamily: fonts.textSemi,
      fontSize: 11,
      color: colors.onSurfaceSecondary,
    },
    bottomBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.divider,
    },
    followBtn: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.brandTertiary,
      borderRadius: radius.pill,
      paddingVertical: spacing.lg,
    },
    followBtnActive: {
      backgroundColor: colors.surfaceSecondary,
    },
    followText: {
      fontFamily: fonts.textBold,
      fontSize: 16,
      color: colors.brand,
    },
    sayHiBtn: {
      flex: 1.5,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingVertical: spacing.lg,
    },
    sayHiText: {
      fontFamily: fonts.textBold,
      fontSize: 16,
      color: colors.onBrand,
    },
    giftBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "#EC4899",
      alignItems: "center",
      justifyContent: "center",
    },
    postMomentBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingVertical: spacing.lg,
    },
    postMomentText: {
      fontFamily: fonts.textBold,
      fontSize: 16,
      color: colors.onBrand,
    },
    momentsAggRow: {
      flexDirection: "row",
      gap: spacing.xl,
    },
    aggText: {
      fontFamily: fonts.text,
      fontSize: 15,
      color: colors.onSurfaceSecondary,
    },
    aggNum: {
      fontFamily: fonts.textBold,
      color: colors.onSurface,
    },
    momentCard: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.md,
      padding: spacing.lg,
      gap: spacing.md,
    },
    momentHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    momentNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs + 2,
    },
    momentName: {
      fontFamily: fonts.displaySemi,
      fontSize: 15,
      color: colors.onSurface,
    },
    momentLangRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      marginTop: 2,
    },
    momentDate: {
      fontFamily: fonts.text,
      fontSize: 12,
      color: colors.onSurfaceSecondary,
    },
    translationBlock: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      backgroundColor: colors.brandTertiary,
      borderRadius: radius.sm,
      padding: spacing.md,
    },
    translationText: {
      flex: 1,
      fontFamily: fonts.text,
      fontSize: 14,
      lineHeight: 20,
      color: colors.onBrandTertiary,
    },
    boostChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "#EC4899",
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
    },
    boostText: {
      fontFamily: fonts.textBold,
      fontSize: 12,
      color: "#FFFFFF",
    },
    momentText: {
      fontFamily: fonts.text,
      fontSize: 15,
      lineHeight: 22,
      color: colors.onSurface,
    },
    momentImg: {
      width: "100%",
      height: 220,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceTertiary,
    },
    momentStats: {
      flexDirection: "row",
      gap: spacing.xl,
      marginTop: spacing.xs,
    },
    momentStat: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs + 2,
    },
    momentStatText: {
      fontFamily: fonts.textSemi,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
    },
  });
