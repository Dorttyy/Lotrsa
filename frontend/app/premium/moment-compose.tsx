import { Ionicons } from "@/src/ui/icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { useAuth } from "@/src/context/AuthContext";
import { fonts } from "@/src/theme";
import { api } from "@/src/utils/api";
import { premiumColors, premiumRadius } from "@/src/premium/theme";

export default function PremiumMomentCompose() {
  const router = useRouter();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [posting, setPosting] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQ, setPollQ] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

  // ---- VIP gate ---------------------------------------------------------
  // Only Premium (VIP) members may compose here. Free users see an upgrade
  // wall instead of the compose form.
  if (user && !user.is_vip) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          <Pressable
            testID="premium-compose-back"
            onPress={() => router.back()}
            style={styles.iconChip}
            hitSlop={8}
          >
            <Ionicons name="close" size={20} color={premiumColors.gold} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.brand}>PREMIUM CLUB</Text>
            <Text style={styles.title}>New Moment</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.gate}>
          <View style={styles.gateIconWrap}>
            <Ionicons name="lock-closed" size={38} color={premiumColors.gold} />
          </View>
          <Text style={styles.gateTitle}>Premium members only</Text>
          <Text style={styles.gateBody}>
            Only verified Premium members can post in the Club Moments feed.
            Upgrade your account to share moments with the community.
          </Text>
          <Pressable
            testID="premium-compose-upgrade"
            onPress={() => router.push("/learn/subscription")}
            style={styles.gateBtn}
          >
            <Ionicons name="diamond" size={14} color={premiumColors.onGold} />
            <Text style={styles.gateBtnText}>Become Premium</Text>
          </Pressable>
          <Pressable
            testID="premium-compose-back-btn"
            onPress={() => router.back()}
            hitSlop={8}
          >
            <Text style={styles.gateSecondary}>Not now</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "Enable photo access in settings.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    setPhotoUri(asset.uri);
    if (asset.base64) setPhotoBase64(`data:image/jpeg;base64,${asset.base64}`);
  };

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "");
    if (!t) return;
    if (tags.length >= 5) return;
    if (tags.includes(t)) return;
    setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const updatePollOption = (i: number, v: string) => {
    setPollOptions(pollOptions.map((o, idx) => (idx === i ? v : o)));
  };
  const addPollOption = () => {
    if (pollOptions.length >= 4) return;
    setPollOptions([...pollOptions, ""]);
  };

  const submit = async () => {
    if (!text.trim() && !photoBase64) {
      Alert.alert("Empty post", "Please add some text or a photo.");
      return;
    }
    setPosting(true);
    try {
      const payload: Record<string, unknown> = { text: text.trim(), tags };
      if (photoBase64) payload.image_url = photoBase64;
      if (showPoll) {
        const validOpts = pollOptions.map((o) => o.trim()).filter(Boolean);
        if (validOpts.length >= 2) {
          payload.poll = { question: pollQ.trim() || undefined, options: validOpts };
        }
      }
      await api.post("/moments", payload);
      router.replace("/premium/moments");
    } catch (e: unknown) {
      Alert.alert("Post failed", (e as Error)?.message || "Please try again.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.screen}
      edges={["top", "bottom"]}
      testID="premium-moment-compose"
    >
      <View style={styles.topBar}>
        <Pressable
          testID="premium-compose-back"
          onPress={() => router.back()}
          style={styles.iconChip}
          hitSlop={8}
        >
          <Ionicons name="close" size={20} color={premiumColors.gold} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>PREMIUM CLUB</Text>
          <Text style={styles.title}>New Moment</Text>
        </View>
        <Pressable
          testID="premium-compose-post"
          onPress={submit}
          disabled={posting}
          style={[styles.postBtn, posting && { opacity: 0.5 }]}
        >
          {posting ? (
            <ActivityIndicator size="small" color={premiumColors.onGold} />
          ) : (
            <Text style={styles.postBtnText}>Post</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Text area */}
          <TextInput
            testID="premium-compose-text"
            value={text}
            onChangeText={setText}
            placeholder="What's on your mind, member?"
            placeholderTextColor={premiumColors.onSurfaceTertiary}
            style={styles.textArea}
            multiline
            autoFocus
          />

          {/* Photo preview */}
          {photoUri && (
            <View style={styles.photoWrap}>
              <Image source={{ uri: photoUri }} style={styles.photo} />
              <Pressable
                testID="premium-compose-photo-remove"
                onPress={() => {
                  setPhotoUri(null);
                  setPhotoBase64(null);
                }}
                style={styles.photoRemove}
              >
                <Ionicons name="close" size={16} color={"#FFF"} />
              </Pressable>
            </View>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <View style={styles.tagList}>
              {tags.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => removeTag(t)}
                  style={styles.tag}
                  testID={`premium-compose-tag-${t}`}
                >
                  <Text style={styles.tagText}>#{t}</Text>
                  <Ionicons name="close" size={12} color={premiumColors.onGold} />
                </Pressable>
              ))}
            </View>
          )}

          {/* Poll editor */}
          {showPoll && (
            <View style={styles.pollCard}>
              <Text style={styles.pollTitle}>Poll</Text>
              <TextInput
                value={pollQ}
                onChangeText={setPollQ}
                placeholder="Ask a question (optional)"
                placeholderTextColor={premiumColors.onSurfaceTertiary}
                style={styles.pollQInput}
              />
              {pollOptions.map((o, i) => (
                <TextInput
                  key={i}
                  value={o}
                  onChangeText={(v) => updatePollOption(i, v)}
                  placeholder={`Option ${i + 1}`}
                  placeholderTextColor={premiumColors.onSurfaceTertiary}
                  style={styles.pollOptInput}
                  testID={`premium-poll-input-${i}`}
                />
              ))}
              {pollOptions.length < 4 && (
                <Pressable
                  onPress={addPollOption}
                  style={styles.pollAdd}
                  testID="premium-poll-add-opt"
                >
                  <Ionicons name="add" size={14} color={premiumColors.gold} />
                  <Text style={styles.pollAddText}>Add option</Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>

        {/* Bottom toolbar */}
        <View style={styles.toolbar}>
          <Pressable
            testID="premium-compose-photo"
            onPress={pickPhoto}
            style={styles.toolBtn}
            hitSlop={6}
          >
            <Ionicons name="image-outline" size={20} color={premiumColors.gold} />
            <Text style={styles.toolLabel}>Photo</Text>
          </Pressable>

          <Pressable
            testID="premium-compose-poll-toggle"
            onPress={() => setShowPoll(!showPoll)}
            style={[styles.toolBtn, showPoll && styles.toolBtnActive]}
            hitSlop={6}
          >
            <Ionicons
              name="stats-chart-outline"
              size={20}
              color={showPoll ? premiumColors.onGold : premiumColors.gold}
            />
            <Text
              style={[
                styles.toolLabel,
                showPoll && { color: premiumColors.onGold },
              ]}
            >
              Poll
            </Text>
          </Pressable>

          <View style={styles.tagInputWrap}>
            <TextInput
              testID="premium-compose-tag-input"
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="#tag"
              placeholderTextColor={premiumColors.onSurfaceTertiary}
              style={styles.tagInput}
              onSubmitEditing={addTag}
              returnKeyType="done"
            />
            <Pressable
              onPress={addTag}
              hitSlop={8}
              disabled={!tagInput.trim()}
            >
              <Ionicons
                name="add-circle"
                size={22}
                color={tagInput.trim() ? premiumColors.gold : premiumColors.onSurfaceTertiary}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: premiumColors.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
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
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: premiumColors.onSurface,
    marginTop: 2,
  },
  postBtn: {
    backgroundColor: premiumColors.gold,
    borderRadius: premiumRadius.pill,
    paddingHorizontal: 18,
    paddingVertical: 9,
    minWidth: 68,
    alignItems: "center",
  },
  postBtnText: {
    fontFamily: fonts.textBold,
    fontSize: 13,
    color: premiumColors.onGold,
  },
  body: { padding: 20, gap: 14, paddingBottom: 40 },
  textArea: {
    fontFamily: fonts.text,
    fontSize: 17,
    color: premiumColors.onSurface,
    minHeight: 140,
    lineHeight: 24,
    textAlignVertical: "top",
  },
  photoWrap: { position: "relative" },
  photo: {
    width: "100%",
    height: 240,
    borderRadius: premiumRadius.lg,
    backgroundColor: premiumColors.surfaceRaised,
  },
  photoRemove: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  tagList: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: premiumColors.gold,
    borderRadius: premiumRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: {
    fontFamily: fonts.textBold,
    fontSize: 12,
    color: premiumColors.onGold,
  },
  pollCard: {
    backgroundColor: premiumColors.surfaceRaised,
    borderRadius: premiumRadius.lg,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: premiumColors.border,
  },
  pollTitle: {
    fontFamily: fonts.textBold,
    fontSize: 12,
    color: premiumColors.gold,
    letterSpacing: 1,
  },
  pollQInput: {
    backgroundColor: premiumColors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: premiumColors.onSurface,
  },
  pollOptInput: {
    backgroundColor: premiumColors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.text,
    fontSize: 13,
    color: premiumColors.onSurface,
  },
  pollAdd: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  pollAddText: {
    fontFamily: fonts.textBold,
    fontSize: 12,
    color: premiumColors.gold,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    paddingHorizontal: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: premiumColors.border,
    backgroundColor: premiumColors.surface,
  },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: premiumRadius.pill,
    backgroundColor: premiumColors.surfaceRaised,
  },
  toolBtnActive: {
    backgroundColor: premiumColors.gold,
  },
  toolLabel: {
    fontFamily: fonts.textBold,
    fontSize: 12,
    color: premiumColors.gold,
  },
  tagInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: premiumColors.surfaceRaised,
    borderRadius: premiumRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagInput: {
    flex: 1,
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: premiumColors.onSurface,
    padding: 0,
  },
  // Gate (non-VIP)
  gate: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 12,
  },
  gateIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: premiumColors.surfaceRaised,
    borderWidth: 2,
    borderColor: premiumColors.gold,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  gateTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: premiumColors.onSurface,
  },
  gateBody: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: premiumColors.onSurfaceSecondary,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 300,
  },
  gateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: premiumColors.gold,
    borderRadius: premiumRadius.pill,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 14,
  },
  gateBtnText: {
    fontFamily: fonts.textBold,
    fontSize: 15,
    color: premiumColors.onGold,
  },
  gateSecondary: {
    fontFamily: fonts.textBold,
    fontSize: 13,
    color: premiumColors.onSurfaceTertiary,
    marginTop: 6,
  },
});
