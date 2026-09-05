import { Ionicons, MaterialCommunityIcons } from "@/src/ui/icons";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
} from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, shadow, spacing, ThemeColors } from "@/src/theme";
import { api } from "@/src/utils/api";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Moments composer — HelloTalk-style layout:
 *   • Header: round ✕ · centered "Moments" title · Post pill
 *   • Big placeholder text area
 *   • "# Add a topic" chip + green abc badge just above the toolbar
 *   • Icon toolbar: mic · photo · emoji · 文A · poll · +
 *   • Tapping the mic opens an inline recording panel (timer, waveform,
 *     cancel / stop / send) that attaches a voice clip to the post.
 */

const SUGGESTED_TAGS = [
  "language",
  "practice",
  "questions",
  "grammar",
  "culture",
  "travel",
  "music",
  "food",
  "study",
  "motivation",
  "meetnewfriends",
  "exchange",
];

const EMOJIS = [
  "😊", "😂", "🥰", "👍", "🎉", "🔥", "😍", "🤔",
  "😅", "🙌", "💪", "🌟", "❤️", "✨", "🎯", "☕",
  "🌍", "📚", "🎧", "🗣️", "🍜", "🌸", "⚽", "🎵",
];

const PLACEHOLDER =
  "Post in your native and learning languages. Add photos, videos, or voice clips, and include topics to help more language partners discover you.";

const notify = (title: string, message: string) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const fmtClock = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const fmtShort = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
};

/** Recorded voice-clip preview pill (play/pause + duration + remove). */
function ClipPill({
  uri,
  durationMs,
  colors,
  styles,
  onRemove,
}: {
  uri: string;
  durationMs: number;
  colors: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
  onRemove: () => void;
}) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const totalSec =
    status.duration > 0 ? status.duration : durationMs / 1000;
  const shown = status.playing
    ? Math.max(0, totalSec - (status.currentTime || 0))
    : totalSec;

  const toggle = () => {
    if (status.playing) {
      player.pause();
    } else {
      if (status.didJustFinish || (status.currentTime || 0) >= totalSec - 0.1) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  return (
    <View style={styles.clipPill} testID="compose-voice-chip">
      <Pressable testID="compose-voice-play" onPress={toggle} hitSlop={10}>
        <Ionicons
          name={status.playing ? "pause" : "play"}
          size={30}
          color={colors.brand}
        />
      </Pressable>
      <Text style={styles.clipPillTime}>{fmtShort(shown)}</Text>
      <Pressable testID="compose-voice-remove" onPress={onRemove} hitSlop={10}>
        <Ionicons name="close" size={22} color={colors.onSurfaceSecondary + "88"} />
      </Pressable>
    </View>
  );
}

type Panel = null | "record" | "emoji" | "poll" | "more";

export default function MomentComposeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<{ base64: string; uri: string; mime: string } | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [tagSheetOpen, setTagSheetOpen] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [posting, setPosting] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [translating, setTranslating] = useState(false);

  // ── Voice clip recording ────────────────────────────────────────────────
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recState, setRecState] = useState<"idle" | "recording" | "stopped">("idle");
  const [recSeconds, setRecSeconds] = useState(0);
  const [bars, setBars] = useState<number[]>([]);
  const [clip, setClip] = useState<{ base64: string; mime: string; durationMs: number; uri: string } | null>(null);
  const recStateRef = useRef(recState);
  recStateRef.current = recState;

  useEffect(() => {
    if (recState !== "recording") return;
    const t = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    const w = setInterval(
      () =>
        setBars((prev) => [...prev.slice(-27), 6 + Math.round(Math.random() * 30)]),
      130,
    );
    return () => {
      clearInterval(t);
      clearInterval(w);
    };
  }, [recState]);

  const startRecording = async () => {
    if (clip) {
      notify("Voice clip", "You already attached a voice clip. Remove it first.");
      return;
    }
    try {
      let perm = await AudioModule.getRecordingPermissionsAsync();
      if (!perm.granted) perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        notify("Microphone", "Microphone permission is needed to record a voice clip.");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecSeconds(0);
      setBars([]);
      setRecState("recording");
      setPanel("record");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {
      notify("Microphone", "Could not start recording. Check the microphone and try again.");
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();
    } catch {
      /* already stopped */
    }
    setRecState("stopped");
  };

  const cancelRecording = async () => {
    try {
      await recorder.stop();
    } catch {
      /* noop */
    }
    setRecState("idle");
    setRecSeconds(0);
    setBars([]);
    setPanel(null);
  };

  const encodeAudio = async (uri: string): Promise<string> => {
    if (Platform.OS === "web") {
      const blob = await fetch(uri).then((r) => r.blob());
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    return FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  };

  const attachClip = async () => {
    const durationMs = Math.max(recSeconds * 1000, 1000);
    try {
      if (recStateRef.current === "recording") await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error("No recording");
      const base64 = await encodeAudio(uri);
      if (!base64) throw new Error("Empty recording");
      setClip({
        base64,
        mime: Platform.OS === "web" ? "audio/webm" : "audio/m4a",
        durationMs,
        uri,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      notify("Voice clip", "Could not save the recording. Try again.");
    }
    setRecState("idle");
    setRecSeconds(0);
    setBars([]);
    setPanel(null);
  };

  // ── Photo ───────────────────────────────────────────────────────────────
  const pickPhoto = async () => {
    if (posting) return;
    if (Platform.OS !== "web") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        notify("Photos", "We need photo access to attach a picture.");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
      base64: true,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) return;
    setPhoto({
      base64: asset.base64,
      uri: asset.uri,
      mime: asset.mimeType || "image/jpeg",
    });
    setPanel(null);
  };

  // ── Topics ──────────────────────────────────────────────────────────────
  const toggleTag = (tag: string) => {
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 8) return prev;
      return [...prev, tag];
    });
  };

  const addCustomTag = () => {
    const clean = customTag.trim().replace(/^#/, "").toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!clean) return;
    if (!tags.includes(clean) && tags.length < 8) setTags((prev) => [...prev, clean]);
    setCustomTag("");
  };

  // ── Poll ────────────────────────────────────────────────────────────────
  const pollActive = panel === "poll" || pollOptions.some((o) => o.trim());
  const setPollOption = (i: number, v: string) =>
    setPollOptions((prev) => prev.map((o, idx) => (idx === i ? v : o)));

  // ── 文A translate: append translation of the text in learning language ──
  const translateDraft = async () => {
    const src = text.trim();
    if (!src || translating) return;
    setTranslating(true);
    try {
      const target =
        user?.learning_languages?.[0] || user?.learning_language || "en";
      const res = await api.post<{ translated: string }>("/ai/translate", {
        text: src,
        target_language: target,
      });
      if (res.translated && !src.includes(res.translated)) {
        setText(`${src}\n\n${res.translated}`);
      }
    } catch (e) {
      notify("Translate", e instanceof Error ? e.message : "Could not translate.");
    } finally {
      setTranslating(false);
    }
  };

  // ── Publish ─────────────────────────────────────────────────────────────
  const publish = async () => {
    if (posting) return;
    const validPollOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!text.trim() && !photo && !clip && validPollOptions.length < 2) {
      notify("Nothing to post", "Add some text, a photo, a voice clip or a poll.");
      return;
    }
    if (pollActive && validPollOptions.length === 1) {
      notify("Poll", "Please fill in at least 2 poll options.");
      return;
    }
    setPosting(true);
    try {
      await api.post("/moments", {
        text: text.trim(),
        image_base64: photo?.base64,
        mime: photo?.mime,
        audio_base64: clip?.base64,
        audio_mime: clip?.mime,
        audio_duration_ms: clip?.durationMs,
        tags,
        poll:
          validPollOptions.length >= 2
            ? {
                question: text.trim() || null,
                options: validPollOptions.map((t) => ({ text: t })),
              }
            : null,
      });
      router.back();
    } catch (e) {
      notify("Post", e instanceof Error ? e.message : "Could not post.");
    } finally {
      setPosting(false);
    }
  };

  const canPost =
    (text.trim().length > 0 ||
      !!photo ||
      !!clip ||
      pollOptions.filter((o) => o.trim()).length >= 2) &&
    !posting;

  const togglePanel = (p: Panel) => setPanel((cur) => (cur === p ? null : p));

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "web" ? undefined : "translate-with-padding"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            testID="compose-back-btn"
            onPress={() => router.back()}
            style={styles.closeBtn}
            hitSlop={8}
          >
            <Ionicons name="close" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>Moments</Text>
          <Pressable
            testID="compose-post-btn"
            onPress={publish}
            disabled={!canPost}
            style={[styles.postBtn, canPost && styles.postBtnActive]}
          >
            {posting ? (
              <ActivityIndicator color={colors.onBrand} size="small" />
            ) : (
              <Text style={[styles.postBtnText, canPost && styles.postBtnTextActive]}>
                Post
              </Text>
            )}
          </Pressable>
        </View>

        {/* Body */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Voice clip attachment — soft pill above the text, like the reference */}
          {clip && (
            <ClipPill
              uri={clip.uri}
              durationMs={clip.durationMs}
              colors={colors}
              styles={styles}
              onRemove={() => setClip(null)}
            />
          )}

          <TextInput
            testID="compose-text-input"
            style={styles.textInput}
            placeholder={PLACEHOLDER}
            placeholderTextColor={colors.onSurfaceSecondary + "99"}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
            autoFocus
          />

          {/* Photo attachment */}
          {photo && (
            <View style={styles.photoBox}>
              <Image source={{ uri: photo.uri }} style={styles.photo} contentFit="cover" />
              <Pressable
                testID="compose-photo-remove"
                style={styles.photoRemove}
                onPress={() => setPhoto(null)}
              >
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          )}

          {/* Poll editor */}
          {panel === "poll" && (
            <View style={styles.pollBox} testID="compose-poll-box">
              <View style={styles.pollHead}>
                <Text style={styles.pollTitle}>Poll</Text>
                <Pressable
                  onPress={() => {
                    setPollOptions(["", ""]);
                    setPanel(null);
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.onSurfaceSecondary} />
                </Pressable>
              </View>
              {pollOptions.map((opt, i) => (
                <View key={i} style={styles.pollRow}>
                  <TextInput
                    style={styles.pollInput}
                    placeholder={`Option ${i + 1}`}
                    placeholderTextColor={colors.onSurfaceSecondary}
                    value={opt}
                    onChangeText={(v) => setPollOption(i, v)}
                    maxLength={60}
                  />
                  {pollOptions.length > 2 && (
                    <Pressable
                      onPress={() =>
                        setPollOptions((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      hitSlop={8}
                    >
                      <Ionicons name="close" size={18} color={colors.onSurfaceSecondary} />
                    </Pressable>
                  )}
                </View>
              ))}
              {pollOptions.length < 4 && (
                <Pressable
                  style={styles.pollAdd}
                  onPress={() => setPollOptions((prev) => [...prev, ""])}
                >
                  <Ionicons name="add" size={16} color={colors.brand} />
                  <Text style={styles.pollAddText}>Add option</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Selected topics */}
          {tags.length > 0 && (
            <View style={styles.tagWrap}>
              {tags.map((t) => (
                <Pressable key={t} style={styles.tagChip} onPress={() => toggleTag(t)}>
                  <Text style={styles.tagChipText}>#{t}</Text>
                  <Ionicons name="close" size={13} color={colors.onBrandTertiary} />
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Add-a-topic row */}
        <View style={styles.topicRow}>
          <Pressable
            testID="compose-add-topic"
            style={styles.topicChip}
            onPress={() => setTagSheetOpen(true)}
          >
            <Text style={styles.topicHash}>#</Text>
            <Text style={styles.topicChipText}>Add a topic</Text>
          </Pressable>
          <View style={styles.abcBadge}>
            <MaterialCommunityIcons name="television-classic" size={15} color="#FFFFFF" />
            <Text style={styles.abcBadgeText}>abc</Text>
          </View>
        </View>

        {/* Toolbar */}
        <View style={styles.toolbar}>
          <Pressable
            testID="compose-tool-mic"
            hitSlop={8}
            onPress={() =>
              panel === "record" ? cancelRecording() : startRecording()
            }
          >
            <Ionicons
              name="mic-outline"
              size={26}
              color={panel === "record" || clip ? colors.brand : colors.onSurface}
            />
          </Pressable>
          <Pressable testID="compose-tool-photo" hitSlop={8} onPress={pickPhoto}>
            <Ionicons
              name="image-outline"
              size={25}
              color={photo ? colors.brand : colors.onSurface}
            />
          </Pressable>
          <Pressable
            testID="compose-tool-emoji"
            hitSlop={8}
            onPress={() => togglePanel("emoji")}
          >
            <Ionicons
              name="happy-outline"
              size={25}
              color={panel === "emoji" ? colors.brand : colors.onSurface}
            />
          </Pressable>
          <Pressable
            testID="compose-tool-translate"
            hitSlop={8}
            onPress={translateDraft}
          >
            {translating ? (
              <ActivityIndicator size="small" color={colors.brand} />
            ) : (
              <Text style={styles.zhGlyph}>文A</Text>
            )}
          </Pressable>
          <Pressable
            testID="compose-tool-poll"
            hitSlop={8}
            onPress={() => togglePanel("poll")}
          >
            <MaterialCommunityIcons
              name="order-bool-ascending-variant"
              size={25}
              color={panel === "poll" ? colors.brand : colors.onSurface}
            />
          </Pressable>
          <Pressable
            testID="compose-tool-more"
            hitSlop={8}
            onPress={() => togglePanel("more")}
          >
            <Ionicons
              name="add-circle-outline"
              size={26}
              color={panel === "more" ? colors.brand : colors.onSurface}
            />
          </Pressable>
        </View>

        {/* Recording panel */}
        {panel === "record" && (
          <View style={styles.recordPanel} testID="compose-record-panel">
            <Text style={styles.recordTimer}>{fmtClock(recSeconds)}</Text>
            <View style={styles.waveRow}>
              <View style={styles.waveBars}>
                {bars.map((h, i) => (
                  <View key={i} style={[styles.waveBar, { height: h }]} />
                ))}
              </View>
              <View style={styles.waveCursor} />
            </View>
            <View style={styles.recordControls}>
              <Pressable
                testID="compose-record-cancel"
                style={styles.recCircle}
                onPress={cancelRecording}
              >
                <Ionicons name="close" size={26} color={colors.onSurface} />
              </Pressable>
              {recState === "recording" ? (
                <Pressable
                  testID="compose-record-stop"
                  style={styles.recCircle}
                  onPress={stopRecording}
                >
                  <View style={styles.stopSquare} />
                </Pressable>
              ) : (
                <Pressable
                  testID="compose-record-resume"
                  style={styles.recCircle}
                  onPress={startRecording}
                >
                  <Ionicons name="mic" size={24} color={colors.brand} />
                </Pressable>
              )}
              <Pressable
                testID="compose-record-send"
                style={styles.recSend}
                onPress={attachClip}
              >
                <Ionicons name="send" size={22} color={colors.onBrand} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Emoji panel */}
        {panel === "emoji" && (
          <View style={styles.emojiPanel} testID="compose-emoji-panel">
            {EMOJIS.map((e) => (
              <Pressable
                key={e}
                style={styles.emojiCell}
                onPress={() => setText((t) => t + e)}
              >
                <Text style={styles.emojiText}>{e}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* More panel */}
        {panel === "more" && (
          <View style={styles.morePanel} testID="compose-more-panel">
            <Pressable style={styles.moreItem} onPress={pickPhoto}>
              <View style={styles.moreIcon}>
                <Ionicons name="image" size={22} color={colors.brand} />
              </View>
              <Text style={styles.moreLabel}>Photo</Text>
            </Pressable>
            <Pressable
              style={styles.moreItem}
              onPress={() => setPanel("poll")}
            >
              <View style={styles.moreIcon}>
                <MaterialCommunityIcons
                  name="order-bool-ascending-variant"
                  size={22}
                  color={colors.brand}
                />
              </View>
              <Text style={styles.moreLabel}>Poll</Text>
            </Pressable>
            <Pressable
              style={styles.moreItem}
              onPress={() => {
                setPanel(null);
                setTagSheetOpen(true);
              }}
            >
              <View style={styles.moreIcon}>
                <Text style={[styles.topicHash, { color: colors.brand }]}>#</Text>
              </View>
              <Text style={styles.moreLabel}>Topic</Text>
            </Pressable>
            <Pressable style={styles.moreItem} onPress={startRecording}>
              <View style={styles.moreIcon}>
                <Ionicons name="mic" size={22} color={colors.brand} />
              </View>
              <Text style={styles.moreLabel}>Voice</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Topic sheet */}
      <Modal
        visible={tagSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setTagSheetOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setTagSheetOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: spacing.xl + insets.bottom }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Add topics</Text>
          <View style={styles.customRow}>
            <TextInput
              testID="compose-custom-tag-input"
              style={styles.customInput}
              placeholder="Type your own topic…"
              placeholderTextColor={colors.onSurfaceSecondary}
              value={customTag}
              onChangeText={setCustomTag}
              onSubmitEditing={addCustomTag}
              maxLength={30}
              autoCapitalize="none"
            />
            <Pressable style={styles.customAdd} onPress={addCustomTag}>
              <Ionicons name="add" size={20} color={colors.onBrand} />
            </Pressable>
          </View>
          <View style={styles.tagWrap}>
            {SUGGESTED_TAGS.map((t) => {
              const on = tags.includes(t);
              return (
                <Pressable
                  key={t}
                  testID={`compose-tag-${t}`}
                  style={[styles.sugChip, on && styles.sugChipOn]}
                  onPress={() => toggleTag(t)}
                >
                  <Text style={[styles.sugChipText, on && styles.sugChipTextOn]}>
                    #{t}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            testID="compose-tags-done"
            style={styles.sheetDone}
            onPress={() => setTagSheetOpen(false)}
          >
            <Text style={styles.sheetDoneText}>Done</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      ...shadow.card,
    },
    title: {
      fontFamily: fonts.displayBold,
      fontSize: 18,
      color: colors.onSurface,
    },
    postBtn: {
      minWidth: 68,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceTertiary,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    postBtnActive: {
      backgroundColor: colors.brand,
    },
    postBtnText: {
      fontFamily: fonts.textBold,
      fontSize: 15,
      color: colors.onSurfaceSecondary,
    },
    postBtnTextActive: {
      color: colors.onBrand,
    },
    body: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      flexGrow: 1,
    },
    textInput: {
      fontFamily: fonts.text,
      fontSize: 17,
      lineHeight: 25,
      color: colors.onSurface,
      minHeight: 140,
      textAlignVertical: "top",
      paddingTop: 4,
    },
    clipPill: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      alignSelf: "flex-start",
      width: "72%",
      minWidth: 220,
      backgroundColor: colors.brandTertiary,
      borderRadius: 26,
      paddingHorizontal: 18,
      paddingVertical: 20,
      marginBottom: spacing.md,
    },
    clipPillTime: {
      fontFamily: fonts.textSemi,
      fontSize: 15,
      color: colors.onSurfaceSecondary,
    },
    clipChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      alignSelf: "flex-start",
      backgroundColor: colors.brandTertiary,
      borderRadius: radius.pill,
      paddingVertical: 8,
      paddingLeft: 8,
      paddingRight: 12,
      marginTop: spacing.md,
    },
    clipPlayIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
    },
    clipText: {
      fontFamily: fonts.textSemi,
      fontSize: 14,
      color: colors.onBrandTertiary,
    },
    photoBox: {
      marginTop: spacing.md,
      borderRadius: radius.md,
      overflow: "hidden",
      alignSelf: "flex-start",
    },
    photo: {
      width: 180,
      height: 180,
    },
    photoRemove: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
    },
    pollBox: {
      marginTop: spacing.md,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: spacing.sm,
    },
    pollHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    pollTitle: {
      fontFamily: fonts.textBold,
      fontSize: 14.5,
      color: colors.onSurface,
    },
    pollRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    pollInput: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.sm,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontFamily: fonts.text,
      fontSize: 14.5,
      color: colors.onSurface,
    },
    pollAdd: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      alignSelf: "flex-start",
      paddingVertical: 4,
    },
    pollAddText: {
      fontFamily: fonts.textSemi,
      fontSize: 13.5,
      color: colors.brand,
    },
    tagWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: spacing.md,
    },
    tagChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.brandTertiary,
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    tagChipText: {
      fontFamily: fonts.textSemi,
      fontSize: 13.5,
      color: colors.onBrandTertiary,
    },
    topicRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    topicChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    topicHash: {
      fontFamily: fonts.textBold,
      fontSize: 16,
      color: colors.onSurface,
    },
    topicChipText: {
      fontFamily: fonts.textBold,
      fontSize: 14.5,
      color: colors.onSurface,
    },
    abcBadge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#4ADE80",
      alignItems: "center",
      justifyContent: "center",
    },
    abcBadgeText: {
      position: "absolute",
      bottom: 5,
      fontFamily: fonts.textBold,
      fontSize: 7,
      color: "#FFFFFF",
    },
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      paddingVertical: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    zhGlyph: {
      fontFamily: fonts.textBold,
      fontSize: 17,
      color: colors.onSurface,
    },
    recordPanel: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
      alignItems: "center",
      backgroundColor: colors.surface,
    },
    recordTimer: {
      fontFamily: fonts.textSemi,
      fontSize: 16,
      color: colors.onSurface,
      marginBottom: spacing.sm,
    },
    waveRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 120,
      marginBottom: spacing.md,
    },
    waveBars: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      minWidth: 4,
      justifyContent: "flex-end",
    },
    waveBar: {
      width: 3,
      borderRadius: 2,
      backgroundColor: colors.brand,
    },
    waveCursor: {
      width: 2.5,
      height: 110,
      borderRadius: 2,
      backgroundColor: colors.brand,
      marginLeft: 4,
    },
    recordControls: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 40,
    },
    recCircle: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    stopSquare: {
      width: 20,
      height: 20,
      borderRadius: 4,
      backgroundColor: colors.onSurface,
    },
    recSend: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
    },
    emojiPanel: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    emojiCell: {
      width: "12.5%",
      alignItems: "center",
      paddingVertical: 8,
    },
    emojiText: {
      fontSize: 24,
    },
    morePanel: {
      flexDirection: "row",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.xl,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    moreItem: {
      alignItems: "center",
      gap: 6,
    },
    moreIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    moreLabel: {
      fontFamily: fonts.textSemi,
      fontSize: 12.5,
      color: colors.onSurfaceSecondary,
    },
    sheetBackdrop: {
      flex: 1,
      backgroundColor: "rgba(15,23,42,0.4)",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
    },
    sheetHandle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.borderStrong,
      marginBottom: spacing.md,
    },
    sheetTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 17,
      color: colors.onSurface,
      marginBottom: spacing.md,
    },
    customRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: spacing.sm,
    },
    customInput: {
      flex: 1,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.pill,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontFamily: fonts.text,
      fontSize: 14.5,
      color: colors.onSurface,
    },
    customAdd: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
    },
    sugChip: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.pill,
      paddingHorizontal: 13,
      paddingVertical: 8,
    },
    sugChipOn: {
      backgroundColor: colors.brandTertiary,
    },
    sugChipText: {
      fontFamily: fonts.textSemi,
      fontSize: 13.5,
      color: colors.onSurfaceTertiary,
    },
    sugChipTextOn: {
      color: colors.onBrandTertiary,
    },
    sheetDone: {
      marginTop: spacing.lg,
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingVertical: 14,
      alignItems: "center",
    },
    sheetDoneText: {
      fontFamily: fonts.textBold,
      fontSize: 15.5,
      color: colors.onBrand,
    },
  });
