import { Ionicons } from "@/src/ui/icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { api, assetUrl } from "@/src/utils/api";

/**
 * Full-screen photo viewer (HelloTalk style): black backdrop, back arrow,
 * bottom action bar — like · comment · AI (vocab) · bookmark · more.
 * Opened from chat photos and moment photos alike.
 *
 * Params:
 *   uri        — encoded image URL (required)
 *   mediaId    — backend media id (enables the AI button)
 *   momentId   — like/comment act on this moment
 *   likeCount / commentCount / liked — initial moment stats
 *   cid / mid  — chat context (bookmark saves the message)
 *   saved      — initial saved state (chat)
 */

const notify = (title: string, message: string) => {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
};

export default function PhotoViewer() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    uri?: string;
    mediaId?: string;
    momentId?: string;
    likeCount?: string;
    commentCount?: string;
    liked?: string;
    cid?: string;
    mid?: string;
    saved?: string;
  }>();
  const uri = params.uri ? decodeURIComponent(params.uri) : null;
  const [liked, setLiked] = useState(params.liked === "1");
  const [likeCount, setLikeCount] = useState(
    parseInt(params.likeCount || "0", 10) || 0,
  );
  const commentCount = parseInt(params.commentCount || "0", 10) || 0;
  const [saved, setSaved] = useState(params.saved === "1");

  const toggleLike = async () => {
    if (!params.momentId) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      await api.post(`/moments/${params.momentId}/like`);
    } catch {
      setLiked(!next);
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
    }
  };

  const openComments = () => {
    if (params.momentId) {
      router.replace(`/moment/${params.momentId}`);
    } else {
      router.back();
    }
  };

  const [aiMenuOpen, setAiMenuOpen] = useState(false);

  const openAiLens = () => {
    setAiMenuOpen(false);
    if (!params.mediaId) {
      notify("AI", "This photo can't be scanned.");
      return;
    }
    router.push({
      pathname: "/ai-lens",
      params: { uri: uri || "", mediaId: params.mediaId },
    });
  };

  const openSelectText = () => {
    setAiMenuOpen(false);
    if (!params.mediaId) {
      notify("AI", "This photo can't be scanned.");
      return;
    }
    router.push({
      pathname: "/select-text",
      params: { uri: uri || "", mediaId: params.mediaId },
    });
  };

  const toggleBookmark = async () => {
    const next = !saved;
    setSaved(next);
    if (params.cid && params.mid) {
      try {
        await api.post(`/chats/${params.cid}/messages/${params.mid}/save`, {
          kind: "saved",
        });
      } catch {
        setSaved(!next);
      }
    }
  };

  const moreOptions = async () => {
    try {
      if (uri) await Share.share({ message: uri });
    } catch {
      /* dismissed */
    }
  };

  return (
    <View style={styles.root} testID="photo-viewer">
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <Pressable
          testID="photo-viewer-back"
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </Pressable>

        <Pressable style={styles.imageWrap} onPress={() => router.back()}>
          {uri ? (
            <Image
              testID="photo-viewer-image"
              source={{ uri: assetUrl(uri) || uri }}
              style={styles.image}
              contentFit="contain"
              transition={120}
            />
          ) : (
            <Text style={styles.missing}>Image unavailable</Text>
          )}
        </Pressable>

        {aiMenuOpen && (
          <View style={styles.aiMenu} testID="photo-ai-menu">
            <Pressable
              testID="photo-ai-vocab"
              style={styles.aiMenuRow}
              onPress={openAiLens}
            >
              <Text style={styles.aiMenuLabel}>AI Vocab</Text>
              <View style={styles.aiGlyphBox}>
                <Text style={styles.aiGlyphText}>AI</Text>
              </View>
            </Pressable>
            <View style={styles.aiMenuDivider} />
            <Pressable
              testID="photo-ai-extract"
              style={styles.aiMenuRow}
              onPress={openSelectText}
            >
              <Text style={styles.aiMenuLabel}>Extract text &{"\n"}translate</Text>
              <Ionicons name="reorder-three" size={22} color="#1F2430" />
            </Pressable>
          </View>
        )}
        <View style={styles.bottomBar}>
          <Pressable
            testID="photo-viewer-like"
            style={styles.action}
            onPress={toggleLike}
            disabled={!params.momentId}
            hitSlop={8}
          >
            <Ionicons
              name={liked ? "thumbs-up" : "thumbs-up-outline"}
              size={24}
              color={liked ? "#0E9AE0" : "#FFFFFF"}
            />
            <Text style={styles.actionText}>{likeCount}</Text>
          </Pressable>
          <Pressable
            testID="photo-viewer-comment"
            style={styles.action}
            onPress={openComments}
            hitSlop={8}
          >
            <Ionicons name="chatbubble-outline" size={23} color="#FFFFFF" />
            <Text style={styles.actionText}>{commentCount}</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable
            testID="photo-viewer-ai"
            onPress={() => setAiMenuOpen((v) => !v)}
            hitSlop={10}
            style={styles.aiBtn}
          >
            <Text style={styles.aiText}>AI</Text>
          </Pressable>
          <Pressable
            testID="photo-viewer-bookmark"
            onPress={toggleBookmark}
            hitSlop={10}
            style={styles.iconBtn}
          >
            <Ionicons
              name={saved ? "bookmark" : "bookmark-outline"}
              size={22}
              color={saved ? "#0E9AE0" : "#FFFFFF"}
            />
          </Pressable>
          <Pressable
            testID="photo-viewer-more"
            onPress={moreOptions}
            hitSlop={10}
            style={styles.iconBtn}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  imageWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  missing: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 15,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 22,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  aiMenu: {
    position: "absolute",
    bottom: 74,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 6,
    paddingHorizontal: 4,
    width: 230,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
    zIndex: 30,
  },
  aiMenuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  aiMenuLabel: {
    fontSize: 15.5,
    color: "#1F2430",
    fontWeight: "500",
  },
  aiMenuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E7E7EC",
    marginHorizontal: 14,
  },
  aiGlyphBox: {
    borderWidth: 1.6,
    borderColor: "#1F2430",
    borderRadius: 7,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  aiGlyphText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1F2430",
  },
  aiBtn: {
    minWidth: 30,
    alignItems: "center",
  },
  aiText: {
    color: "#8B7CF6",
    fontSize: 19,
    fontWeight: "700",
  },
  iconBtn: {
    alignItems: "center",
  },
});
