import { Ionicons } from "@/src/ui/icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { BackButton } from "@/src/components/BackButton";
import { RoomMomentCard } from "@/src/components/RoomMomentCard";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { api, RoomCardInfo } from "@/src/utils/api";

/**
 * Full-screen composer for sharing a voice room to Moments. Shows a large
 * live preview of the RoomMomentCard at the bottom, and a caption TextInput
 * on top — exactly like the normal moment composer, but with the room card
 * already attached instead of a photo/text-only note.
 */
export default function ShareToMomentsScreen() {
  const { room_id } = useLocalSearchParams<{ room_id?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [room, setRoom] = useState<RoomCardInfo | null>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!room_id) return;
    (async () => {
      try {
        // Fetch the live room to preview the card the recipient will see.
        const list = await api.get<any[]>("/rooms");
        const doc = list.find((r) => r.id === room_id);
        if (doc) {
          setRoom({
            id: doc.id,
            title: doc.title,
            topic: doc.topic,
            mode: doc.mode,
            language: doc.language,
            languages: doc.languages,
            member_count: doc.member_count,
            host: doc.host,
            is_live: true,
          });
        }
      } catch {
        // ignore — user still sees a fallback "voice room" card.
      } finally {
        setLoading(false);
      }
    })();
  }, [room_id]);

  const post = async () => {
    if (!room_id || posting) return;
    setPosting(true);
    try {
      await api.post(`/rooms/${room_id}/share-to-moments`, {
        text: caption.trim() || null,
      });
      Alert.alert(
        "Shared to Moments 🎉",
        "Your room is now visible on your Moments feed.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (e) {
      Alert.alert(
        "Share",
        e instanceof Error ? e.message : "Could not share this room right now.",
      );
    } finally {
      setPosting(false);
    }
  };

  if (!room_id) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <BackButton testID="share-moments-back-btn" />
          <Text style={styles.title}>Share to Moments</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Voice room not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <BackButton testID="share-moments-back-btn" />
          <Text style={styles.title}>Share to Moments</Text>
          <Pressable
            testID="share-moments-post-btn"
            onPress={post}
            disabled={posting || !room}
            style={[styles.postBtn, (posting || !room) && { opacity: 0.5 }]}
          >
            {posting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.postBtnText}>Post</Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            testID="share-moments-caption-input"
            style={styles.caption}
            placeholder="Say something about this room…"
            placeholderTextColor={colors.onSurfaceSecondary}
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={500}
            autoFocus
          />
          <Text style={styles.counter}>{caption.length}/500</Text>

          <View style={styles.previewLabel}>
            <Ionicons name="mic" size={14} color={colors.onSurfaceSecondary} />
            <Text style={styles.previewLabelText}>Voice room preview</Text>
          </View>
          {loading || !room ? (
            <View style={styles.previewLoading}>
              <ActivityIndicator color={colors.brand} />
            </View>
          ) : (
            <RoomMomentCard
              testID="share-moments-room-preview"
              room={room}
              onPress={() => {}}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.surfaceSecondary,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    title: {
      fontFamily: fonts.displaySemi,
      fontSize: 17,
      color: colors.onSurface,
    },
    postBtn: {
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: 8,
      minWidth: 68,
      alignItems: "center",
    },
    postBtnText: {
      fontFamily: fonts.textBold,
      fontSize: 14,
      color: "#FFFFFF",
    },
    body: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    caption: {
      fontFamily: fonts.textSemi,
      fontSize: 16,
      color: colors.onSurface,
      minHeight: 100,
      textAlignVertical: "top",
      lineHeight: 22,
      ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}),
    },
    counter: {
      fontFamily: fonts.textSemi,
      fontSize: 11,
      color: colors.onSurfaceSecondary,
      alignSelf: "flex-end",
    },
    previewLabel: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    previewLabelText: {
      fontFamily: fonts.textBold,
      fontSize: 12,
      color: colors.onSurfaceSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    previewLoading: {
      height: 160,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xl,
    },
    emptyText: {
      fontFamily: fonts.textSemi,
      color: colors.onSurfaceSecondary,
    },
  });
