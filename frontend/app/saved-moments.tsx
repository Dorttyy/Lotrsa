/**
 * Saved Moments — the caller's bookmarked posts.
 *
 * Rows show author, snippet, optional image thumb and an "unsave" bookmark
 * toggle. Tapping a row opens the full moment detail.
 */

import { Ionicons } from "@/src/ui/icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { Avatar } from "@/src/components/Avatar";
import { IconChip } from "@/src/components/IconChip";
import { countryToCode } from "@/src/constants/countries";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { api, assetUrl, Moment } from "@/src/utils/api";
import { timeAgo } from "@/src/utils/time";

export default function SavedMoments() {
  const router = useRouter();
  const { colors } = useTheme();
  const { loading: authLoading } = useAuth();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [items, setItems] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Moment[]>("/moments/saved/list");
      setItems(data);
    } catch {
      // keep the current list on failure
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (authLoading) return; // wait for the token to be restored
      load();
    }, [authLoading, load]),
  );

  const unsave = async (m: Moment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems((prev) => prev.filter((x) => x.id !== m.id));
    try {
      await api.post(`/moments/${m.id}/bookmark`);
    } catch {
      load();
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="saved-moments-screen">
      <View style={styles.header}>
        <IconChip
          testID="sm-back"
          tint="neutral"
          icon="chevron-back"
          size={22}
          onPress={() => router.back()}
        />
        <Text style={styles.headerTitle}>Saved Moments</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(m) => m.id}
          contentContainerStyle={
            items.length === 0 ? { flex: 1 } : { paddingBottom: spacing.xl }
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.brand}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap} testID="sm-empty">
              <Ionicons
                name="bookmark-outline"
                size={44}
                color={colors.onSurfaceSecondary}
              />
              <Text style={styles.emptyTitle}>No saved moments yet</Text>
              <Text style={styles.emptySub}>
                Tap the bookmark icon on any post to keep it here.
              </Text>
              <Pressable
                testID="sm-empty-cta"
                onPress={() => router.push("/(tabs)/moments")}
                style={styles.emptyBtn}
              >
                <Text style={styles.emptyBtnText}>Browse Moments</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`sm-item-${item.id}`}
              style={styles.card}
              onPress={() => router.push(`/moment/${item.id}`)}
            >
              <View style={styles.cardTop}>
                <Avatar
                  name={item.author?.name}
                  url={item.author?.avatar_url}
                  size={38}
                  flagCode={countryToCode(item.author?.country)}
                  frame={item.author?.active_frame}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.authorName} numberOfLines={1}>
                    {item.author?.name}
                  </Text>
                  <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
                </View>
                <Pressable
                  testID={`sm-unsave-${item.id}`}
                  onPress={() => unsave(item)}
                  hitSlop={10}
                >
                  <Ionicons name="bookmark" size={20} color={colors.brand} />
                </Pressable>
              </View>
              {item.text ? (
                <Text style={styles.text} numberOfLines={3}>
                  {item.text}
                </Text>
              ) : null}
              {item.image_url ? (
                <Image
                  source={{ uri: assetUrl(item.image_url) ?? undefined }}
                  style={styles.thumb}
                  resizeMode="cover"
                />
              ) : null}
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="heart" size={13} color={colors.onSurfaceSecondary} />
                  <Text style={styles.metaText}>{item.like_count}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons
                    name="chatbubble"
                    size={12}
                    color={colors.onSurfaceSecondary}
                  />
                  <Text style={styles.metaText}>{item.comment_count}</Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceSecondary },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontFamily: fonts.displayBold,
      fontSize: 24,
      color: colors.onSurface,
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    card: {
      backgroundColor: colors.surface,
      marginHorizontal: spacing.lg,
      marginBottom: 10,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: 8,
    },
    cardTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    authorName: {
      fontFamily: fonts.textBold,
      fontSize: 14,
      color: colors.onSurface,
    },
    time: {
      fontFamily: fonts.text,
      fontSize: 11,
      color: colors.onSurfaceSecondary,
    },
    text: {
      fontFamily: fonts.text,
      fontSize: 13.5,
      lineHeight: 19,
      color: colors.onSurface,
    },
    thumb: {
      width: "100%",
      height: 150,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceSecondary,
    },
    metaRow: {
      flexDirection: "row",
      gap: spacing.md,
    },
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    metaText: {
      fontFamily: fonts.text,
      fontSize: 12,
      color: colors.onSurfaceSecondary,
    },
    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: spacing.xl,
    },
    emptyTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 16,
      color: colors.onSurface,
    },
    emptySub: {
      fontFamily: fonts.text,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
      textAlign: "center",
    },
    emptyBtn: {
      marginTop: 6,
      backgroundColor: colors.brand,
      paddingHorizontal: 22,
      paddingVertical: 10,
      borderRadius: 999,
    },
    emptyBtnText: {
      fontFamily: fonts.textBold,
      fontSize: 13,
      color: colors.onBrand,
    },
  });
