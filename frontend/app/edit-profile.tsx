import { Ionicons } from "@/src/ui/icons";
import {
  AudioModule,
  RecordingPresets,
  useAudioRecorder,
} from "expo-audio";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/src/components/Avatar";
import { BackButton } from "@/src/components/BackButton";
import { VoiceBubble } from "@/src/components/VoiceBubble";
import { INTERESTS, MAX_INTERESTS } from "@/src/constants/interests";
import {
  LANGUAGES,
  langName,
  PROFICIENCY_LEVELS,
} from "@/src/constants/languages";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, shadow, spacing, ThemeColors } from "@/src/theme";
import { api, assetUrl, User } from "@/src/utils/api";
import { FlagIcon } from "@/src/components/FlagIcon";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];
const BLOOD_TYPES = ["A", "B", "AB", "O"];
const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const ZODIACS: { name: string; from: [number, number]; to: [number, number] }[] =
  [
    { name: "Capricorn", from: [12, 22], to: [1, 19] },
    { name: "Aquarius", from: [1, 20], to: [2, 18] },
    { name: "Pisces", from: [2, 19], to: [3, 20] },
    { name: "Aries", from: [3, 21], to: [4, 19] },
    { name: "Taurus", from: [4, 20], to: [5, 20] },
    { name: "Gemini", from: [5, 21], to: [6, 20] },
    { name: "Cancer", from: [6, 21], to: [7, 22] },
    { name: "Leo", from: [7, 23], to: [8, 22] },
    { name: "Virgo", from: [8, 23], to: [9, 22] },
    { name: "Libra", from: [9, 23], to: [10, 22] },
    { name: "Scorpio", from: [10, 23], to: [11, 21] },
    { name: "Sagittarius", from: [11, 22], to: [12, 21] },
  ];

const zodiacFor = (birthday?: string | null): string => {
  if (!birthday) return "";
  const parts = birthday.split("-");
  if (parts.length < 3) return "";
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (!m || !d) return "";
  for (const z of ZODIACS) {
    if (z.name === "Capricorn") {
      if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return "Capricorn";
      continue;
    }
    if (m === z.from[0] && d >= z.from[1]) return z.name;
    if (m === z.to[0] && d <= z.to[1]) return z.name;
  }
  return "";
};

type EditorType =
  | "text"
  | "textarea"
  | "options"
  | "lang-native"
  | "lang-multi"
  | "interests"
  | "birthday"
  | "username";

interface EditorConfig {
  type: EditorType;
  title: string;
  fieldKey: string;
  choices?: { value: string; label: string }[];
  cap?: number;
  exclude?: string[];
  sub?: string;
}

export default function EditProfile() {
  const { user, setUser } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [editor, setEditor] = useState<EditorConfig | null>(null);
  const [draft, setDraft] = useState("");
  const [draftArr, setDraftArr] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savingLevelFor, setSavingLevelFor] = useState<string | null>(null);
  // Inline text editing — edits happen right in the row, no modal.
  const [inlineKey, setInlineKey] = useState<string | null>(null);
  const [inlineDraft, setInlineDraft] = useState("");
  const [inlineBusy, setInlineBusy] = useState(false);
  const [inlineErr, setInlineErr] = useState<string | null>(null);
  // Voice introduction recording
  const [recordingBio, setRecordingBio] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [uploadingVoiceBio, setUploadingVoiceBio] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    if (!recordingBio) return;
    const t = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recordingBio]);

  const persist = useCallback(
    async (patch: Record<string, unknown>) => {
      const updated = await api.put<User>("/users/me", patch);
      setUser(updated);
    },
    [setUser],
  );

  // ── Paid Practice (offer coin-gated practice conversations) ──
  const togglePaidPractice = async (on: boolean) => {
    try {
      await persist({
        paid_practice: on,
        ...(on && !user?.practice_rate ? { practice_rate: 50 } : {}),
      });
    } catch {
      setErr("Could not update paid practice.");
    }
  };
  const changePracticeRate = async (delta: number) => {
    const next = Math.min(1000, Math.max(5, (user?.practice_rate ?? 50) + delta));
    try {
      await persist({ practice_rate: next });
    } catch {
      setErr("Could not update the rate.");
    }
  };

  // ── Gift-Gated Messaging (require a gift before strangers can chat) ──
  const toggleGiftGate = async (on: boolean) => {
    try {
      await persist({
        gift_gate: on,
        ...(on && !user?.gift_gate_min ? { gift_gate_min: 20 } : {}),
      });
    } catch {
      setErr("Could not update gift gate.");
    }
  };
  const changeGiftMin = async (delta: number) => {
    const next = Math.min(1000, Math.max(5, (user?.gift_gate_min ?? 20) + delta));
    try {
      await persist({ gift_gate_min: next });
    } catch {
      setErr("Could not update the amount.");
    }
  };

  // ── Inline text editing ──
  const startInline = (fieldKey: string, value: string | null | undefined) => {
    setInlineErr(null);
    setInlineDraft(value || "");
    setInlineKey(fieldKey);
  };

  const cancelInline = () => {
    if (inlineBusy) return;
    setInlineKey(null);
    setInlineErr(null);
  };

  const saveInline = async () => {
    if (!inlineKey || inlineBusy) return;
    const value = inlineDraft.trim();
    setInlineErr(null);
    if (inlineKey === "birthday" && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setInlineErr("Use the format YYYY-MM-DD");
      return;
    }
    setInlineBusy(true);
    try {
      if (inlineKey === "username") {
        const updated = await api.put<User>("/users/me/username", {
          username: value.replace(/^@/, "").toLowerCase(),
        });
        setUser(updated);
      } else {
        await persist({ [inlineKey]: value });
      }
      setInlineKey(null);
    } catch (e) {
      setInlineErr(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setInlineBusy(false);
    }
  };

  // ── Voice introduction ──
  const encodeAudio = async (uri: string): Promise<string> => {
    if (Platform.OS === "web") {
      const blob = await fetch(uri).then((r) => r.blob());
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    const FileSystem = await import("expo-file-system/legacy");
    return FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  };

  const startVoiceBio = async () => {
    try {
      let perm = await AudioModule.getRecordingPermissionsAsync();
      if (!perm.granted) {
        perm = await AudioModule.requestRecordingPermissionsAsync();
      }
      if (!perm.granted) {
        Alert.alert(
          "Microphone",
          "Microphone access is needed to record your voice introduction.",
        );
        return;
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecordSeconds(0);
      setRecordingBio(true);
    } catch {
      Alert.alert("Voice intro", "Could not start recording. Try again.");
    }
  };

  const stopVoiceBio = async () => {
    const durationMs = Math.max(recordSeconds * 1000, 1000);
    setRecordingBio(false);
    setUploadingVoiceBio(true);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error("No recording");
      const base64 = await encodeAudio(uri);
      const mime = Platform.OS === "web" ? "audio/webm" : "audio/m4a";
      const updated = await api.post<User>("/users/me/voice-bio", {
        audio_base64: base64,
        mime,
        duration_ms: durationMs,
      });
      setUser(updated);
    } catch {
      Alert.alert("Voice intro", "Could not save your voice intro. Try again.");
    } finally {
      setUploadingVoiceBio(false);
    }
  };

  const removeVoiceBio = () => {
    const doRemove = async () => {
      try {
        const updated = await api.delete<User>("/users/me/voice-bio");
        setUser(updated);
      } catch {
        Alert.alert("Voice intro", "Could not remove. Try again.");
      }
    };
    if (Platform.OS === "web") {
      if (window.confirm("Remove your voice introduction?")) doRemove();
    } else {
      Alert.alert("Voice intro", "Remove your voice introduction?", [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: doRemove },
      ]);
    }
  };

  if (!user) {
    return null;
  }

  const isVip = !!user.is_vip;
  const learnCap = isVip ? 3 : 1;
  const learningLangs = user.learning_languages?.length
    ? user.learning_languages
    : user.learning_language
      ? [user.learning_language]
      : [];

  const pickImage = async (): Promise<
    { base64: string; mime: string } | null
  > => {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!current.granted) {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        if (!perm.canAskAgain) {
          Alert.alert(
            "Photos",
            "Photo access is disabled. Enable it in Settings.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ],
          );
        } else {
          Alert.alert("Photos", "Photo access is needed to pick an image.");
        }
        return null;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) return null;
    return { base64: asset.base64, mime: asset.mimeType || "image/jpeg" };
  };

  const changeAvatar = async () => {
    const img = await pickImage();
    if (!img) return;
    setUploadingAvatar(true);
    try {
      const updated = await api.post<User>("/users/me/avatar", {
        image_base64: img.base64,
        mime: img.mime,
      });
      setUser(updated);
    } catch {
      Alert.alert("Photo", "Could not update your photo. Try again.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const changeCover = async () => {
    const img = await pickImage();
    if (!img) return;
    setUploadingCover(true);
    try {
      const updated = await api.post<User>("/users/me/cover", {
        image_base64: img.base64,
        mime: img.mime,
      });
      setUser(updated);
    } catch {
      Alert.alert("Cover", "Could not update cover. Try again.");
    } finally {
      setUploadingCover(false);
    }
  };

  // ── Editor openers (pickers only — text fields edit inline in the row) ──
  const openOptions = (
    fieldKey: string,
    title: string,
    current: string | null | undefined,
    choices: { value: string; label: string }[],
  ) => {
    setErr(null);
    setDraft(current || "");
    setEditor({ type: "options", title, fieldKey, choices });
  };

  const openNative = () => {
    setErr(null);
    setDraft(user.native_language || "");
    setEditor({
      type: "lang-native",
      title: "Native language",
      fieldKey: "native_language",
    });
  };

  const openTeach = () => {
    if (!isVip) {
      Alert.alert(
        "VIP feature",
        "VIP members can teach up to 2 extra languages. Upgrade to unlock!",
        [
          { text: "Not now", style: "cancel" },
          { text: "Get VIP", onPress: () => router.push("/market") },
        ],
      );
      return;
    }
    setErr(null);
    setDraftArr(user.teach_languages || []);
    setEditor({
      type: "lang-multi",
      title: "Teaching languages",
      fieldKey: "teach_languages",
      cap: 2,
      exclude: [user.native_language || ""],
    });
  };

  const openLearn = () => {
    setErr(null);
    setDraftArr(learningLangs);
    setEditor({
      type: "lang-multi",
      title: "Learning languages",
      fieldKey: "learning_languages",
      cap: learnCap,
      exclude: [user.native_language || "", ...(user.teach_languages || [])],
    });
  };

  const openInterests = () => {
    setErr(null);
    setDraftArr(user.interests || []);
    setEditor({
      type: "interests",
      title: "Hobbies & Interests",
      fieldKey: "interests",
      cap: MAX_INTERESTS,
    });
  };

  const closeEditor = () => {
    if (busy) return;
    setEditor(null);
  };

  const commit = async () => {
    if (!editor || busy) return;
    setBusy(true);
    setErr(null);
    try {
      if (editor.type === "username") {
        const updated = await api.put<User>("/users/me/username", {
          username: draft.trim().toLowerCase(),
        });
        setUser(updated);
      } else if (editor.type === "birthday") {
        const v = draft.trim();
        if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
          setErr("Please use the format YYYY-MM-DD");
          setBusy(false);
          return;
        }
        await persist({ birthday: v });
      } else if (editor.type === "lang-multi") {
        if (editor.fieldKey === "learning_languages") {
          await persist({
            learning_languages: draftArr,
            learning_language: draftArr[0] || null,
          });
        } else {
          await persist({ teach_languages: draftArr });
        }
      } else if (editor.type === "lang-native") {
        await persist({ native_language: draft });
      } else if (editor.type === "interests") {
        await persist({ interests: draftArr });
      } else {
        await persist({ [editor.fieldKey]: draft.trim() });
      }
      setEditor(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const toggleArr = (code: string, cap: number) => {
    setDraftArr((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= cap) return prev;
      return [...prev, code];
    });
  };

  const zodiac = zodiacFor(user.birthday);

  const setLangLevel = async (code: string, level: string) => {
    setSavingLevelFor(code);
    try {
      await persist({ proficiencies: { [code]: level } });
    } catch {
      // ignore, keep previous value
    } finally {
      setSavingLevelFor(null);
    }
  };

  const LangLevelRow = ({ code, last }: { code: string; last?: boolean }) => {
    const level = user.proficiencies?.[code];
    const idx = level ? PROFICIENCY_LEVELS.indexOf(level) : -1;
    const filled = idx >= 0 ? idx + 1 : 0;
    return (
      <View style={[styles.levelRow, !last && styles.rowBorder]}>
        <View style={styles.levelLabelCol}>
          <FlagIcon code={code} size={22} />
          <Text style={styles.levelLangName}>{langName(code)}</Text>
        </View>
        <View style={styles.levelRight}>
          {savingLevelFor === code ? (
            <ActivityIndicator size="small" color={colors.brand} />
          ) : (
            <>
              <View style={styles.levelDotsRow}>
                {PROFICIENCY_LEVELS.map((lvl, i) => (
                  <Pressable
                    key={lvl}
                    testID={`edit-level-dot-${code}-${i}`}
                    hitSlop={6}
                    onPress={() => setLangLevel(code, lvl)}
                    style={[
                      styles.levelDot,
                      i < filled && styles.levelDotFilled,
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.levelText} numberOfLines={1}>
                {level || "Set level"}
              </Text>
            </>
          )}
        </View>
      </View>
    );
  };

  // Inline-editable text row: tapping turns the value into a TextInput right
  // in place — no modal or separate screen. Render-function (not a nested
  // component) so the TextInput never remounts and keeps focus while typing.
  const renderInlineRow = ({
    icon,
    iconColor,
    iconBg,
    label,
    fieldKey,
    value,
    placeholder,
    multiline,
    sub,
    last,
  }: {
    icon?: IconName;
    iconColor?: string;
    iconBg?: string;
    label: string;
    fieldKey: string;
    value?: string | null;
    placeholder?: string;
    multiline?: boolean;
    sub?: string;
    last?: boolean;
  }) => {
    const editing = inlineKey === fieldKey;
    return (
      <View style={[styles.row, !last && styles.rowBorder, { alignItems: editing || multiline ? "flex-start" : "center" }]}>
        {icon ? (
          <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>{label}</Text>
          {editing ? (
            <>
              <TextInput
                testID={`inline-input-${fieldKey}`}
                style={[styles.inlineInput, multiline && styles.inlineTextarea]}
                value={inlineDraft}
                onChangeText={setInlineDraft}
                placeholder={placeholder || label}
                placeholderTextColor={colors.onSurfaceSecondary}
                multiline={!!multiline}
                autoFocus
                autoCapitalize={fieldKey === "username" ? "none" : "sentences"}
                autoCorrect={fieldKey !== "username"}
                onSubmitEditing={multiline ? undefined : saveInline}
              />
              {sub ? <Text style={styles.inlineSub}>{sub}</Text> : null}
              {inlineErr ? (
                <Text style={styles.inlineErr}>{inlineErr}</Text>
              ) : null}
            </>
          ) : (
            <Pressable
              testID={`inline-row-${fieldKey}`}
              onPress={() => startInline(fieldKey, value)}
            >
              <Text
                style={[styles.rowValue, !value && styles.rowPlaceholder]}
                numberOfLines={multiline ? 3 : 1}
              >
                {value || placeholder || "Not set"}
              </Text>
            </Pressable>
          )}
        </View>
        {editing ? (
          <View style={styles.inlineActions}>
            {inlineBusy ? (
              <ActivityIndicator size="small" color={colors.brand} />
            ) : (
              <>
                <Pressable
                  testID={`inline-cancel-${fieldKey}`}
                  style={[styles.inlineBtn, styles.inlineBtnGhost]}
                  onPress={cancelInline}
                  hitSlop={4}
                >
                  <Ionicons name="close" size={16} color={colors.onSurfaceSecondary} />
                </Pressable>
                <Pressable
                  testID={`inline-save-${fieldKey}`}
                  style={styles.inlineBtn}
                  onPress={saveInline}
                  hitSlop={4}
                >
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </Pressable>
              </>
            )}
          </View>
        ) : (
          <Pressable
            onPress={() => startInline(fieldKey, value)}
            hitSlop={6}
          >
            <Ionicons name="pencil" size={15} color={colors.brand} />
          </Pressable>
        )}
      </View>
    );
  };

  const Row = ({
    icon,
    iconColor,
    iconBg,
    label,
    value,
    placeholder,
    onPress,
    editText,
    dot,
    accent,
    last,
  }: {
    icon?: IconName;
    iconColor?: string;
    iconBg?: string;
    label: string;
    value?: string | null;
    placeholder?: string;
    onPress?: () => void;
    editText?: boolean;
    dot?: boolean;
    accent?: boolean;
    last?: boolean;
  }) => (
    <Pressable
      style={[styles.row, !last && styles.rowBorder]}
      onPress={onPress}
      disabled={!onPress}
    >
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text
          style={[
            styles.rowValue,
            !value && styles.rowPlaceholder,
          ]}
          numberOfLines={1}
        >
          {value || placeholder || "Not set"}
        </Text>
        {accent ? <View style={styles.rowAccent} /> : null}
      </View>
      {dot ? <View style={styles.rowDot} /> : null}
      {editText ? <Text style={styles.editText}>Edit</Text> : null}
      {onPress ? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.onSurfaceSecondary}
        />
      ) : null}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover header */}
        <View style={styles.coverWrap}>
          {user.cover_url ? (
            <Image
              source={{ uri: assetUrl(user.cover_url) || undefined }}
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
            <Ionicons name="earth" size={220} color="rgba(255,255,255,0.12)" />
          </View>
          <SafeAreaView edges={["top"]} style={styles.coverBar}>
            <BackButton testID="edit-back-btn" variant="overlay" />
            <Pressable
              testID="edit-cover-btn"
              style={styles.coverImgBtn}
              onPress={changeCover}
              disabled={uploadingCover}
            >
              {uploadingCover ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="image" size={20} color="#FFFFFF" />
              )}
            </Pressable>
          </SafeAreaView>
        </View>

        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View>
            <Avatar name={user.name} url={user.avatar_url} size={88} />
            <Pressable
              testID="edit-avatar-btn"
              style={styles.avatarCamBtn}
              onPress={changeAvatar}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera" size={18} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
        </View>

        {/* About Me */}
        <Text style={styles.sectionHeader}>About Me</Text>
        <View style={styles.card}>
          {renderInlineRow({
            label: "Name",
            fieldKey: "name",
            value: user.name,
            placeholder: "Your name",
          })}
          {renderInlineRow({
            label: "Self-introduction",
            fieldKey: "bio",
            value: user.bio,
            placeholder: "Add a self-introduction so partners know you",
            multiline: true,
          })}

          {/* Voice introduction */}
          <View style={[styles.row, { alignItems: "center" }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Voice Introduction</Text>
              {recordingBio ? (
                <View style={styles.voiceRecRow}>
                  <View style={styles.voiceRecDot} />
                  <Text style={styles.voiceRecText}>
                    Recording… 0:{recordSeconds.toString().padStart(2, "0")}
                  </Text>
                </View>
              ) : uploadingVoiceBio ? (
                <View style={styles.voiceRecRow}>
                  <ActivityIndicator size="small" color={colors.brand} />
                  <Text style={styles.voiceRecText}>Saving…</Text>
                </View>
              ) : user.voice_bio_id ? (
                <View style={styles.voiceBubbleWrap}>
                  <VoiceBubble
                    testID="voice-bio-bubble"
                    audioId={user.voice_bio_id}
                    durationMs={user.voice_bio_duration_ms}
                    mine={false}
                  />
                </View>
              ) : (
                <Text style={[styles.rowValue, styles.rowPlaceholder]}>
                  Let partners hear your voice
                </Text>
              )}
            </View>
            {recordingBio ? (
              <Pressable
                testID="voice-bio-stop-btn"
                style={[styles.voiceCircleBtn, { backgroundColor: colors.error }]}
                onPress={stopVoiceBio}
              >
                <Ionicons name="stop" size={16} color="#FFFFFF" />
              </Pressable>
            ) : uploadingVoiceBio ? null : user.voice_bio_id ? (
              <View style={styles.inlineActions}>
                <Pressable
                  testID="voice-bio-delete-btn"
                  style={[styles.voiceCircleBtn, { backgroundColor: colors.surfaceTertiary }]}
                  onPress={removeVoiceBio}
                >
                  <Ionicons name="trash" size={15} color={colors.onSurfaceSecondary} />
                </Pressable>
                <Pressable
                  testID="voice-bio-rerecord-btn"
                  style={styles.voiceCircleBtn}
                  onPress={startVoiceBio}
                >
                  <Ionicons name="mic" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                testID="voice-bio-record-btn"
                style={styles.voiceCircleBtn}
                onPress={startVoiceBio}
              >
                <Ionicons name="mic" size={16} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Language */}
        <Text style={styles.sectionHeader}>Language</Text>
        <View style={styles.card}>
          <Row
            label="Native"
            value={langName(user.native_language) || "Set native language"}
            accent
            onPress={openNative}
          />
          <Row
            label="Add More Teaching Languages"
            value={
              user.teach_languages?.length
                ? user.teach_languages.map((c) => langName(c)).join(", ")
                : undefined
            }
            placeholder="VIP · Teach extra languages"
            dot={!isVip}
            onPress={openTeach}
          />
          <Row
            label={`Learn ${learningLangs.length}`}
            value={
              learningLangs.length
                ? learningLangs.map((c) => langName(c)).join(", ")
                : "Pick languages to learn"
            }
            onPress={openLearn}
            last
          />
        </View>

        {/* Proficiency levels per learning language */}
        {learningLangs.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Proficiency</Text>
            <View style={styles.card}>
              {learningLangs.map((code, i) => (
                <LangLevelRow
                  key={code}
                  code={code}
                  last={i === learningLangs.length - 1}
                />
              ))}
            </View>
          </>
        )}

        {/* VIP banner */}
        <Pressable
          testID="edit-vip-banner"
          style={styles.vipBanner}
          onPress={() => router.push("/market")}
        >
          <View style={styles.vipTag}>
            <Text style={styles.vipTagText}>VIP</Text>
          </View>
          <Text style={styles.vipBannerText}>Learn/Teach more languages</Text>
        </Pressable>

        {/* Interests */}
        <Text style={styles.sectionHeader}>Interests</Text>
        <View style={styles.card}>
          <Row
            icon="musical-notes"
            iconColor="#3B82F6"
            iconBg="#DBEAFE"
            label="Add Hobbies"
            value={user.interests?.length ? user.interests.join(", ") : undefined}
            placeholder="Add your hobbies"
            onPress={openInterests}
          />
          {renderInlineRow({
            icon: "airplane",
            iconColor: "#3B82F6",
            iconBg: "#DBEAFE",
            label: "Places I want to go",
            fieldKey: "places_to_go",
            value: user.places_to_go,
            placeholder: "Add a dream destination",
            last: true,
          })}
        </View>

        {/* Personal Info */}
        <Text style={styles.sectionHeader}>Personal Info</Text>
        <View style={styles.card}>
          <Row
            icon="happy"
            iconColor="#0E9AE0"
            iconBg="#E1F2EC"
            label="My MBTI"
            value={user.mbti}
            placeholder="Choose your MBTI"
            onPress={() =>
              openOptions(
                "mbti",
                "My MBTI",
                user.mbti,
                MBTI_TYPES.map((m) => ({ value: m, label: m })),
              )
            }
          />
          <Row
            icon="water"
            iconColor="#0E9AE0"
            iconBg="#E1F2EC"
            label="My Blood Type"
            value={user.blood_type}
            placeholder="Choose blood type"
            onPress={() =>
              openOptions(
                "blood_type",
                "My Blood Type",
                user.blood_type,
                BLOOD_TYPES.map((b) => ({ value: b, label: b })),
              )
            }
          />
          {renderInlineRow({
            icon: "home",
            iconColor: "#38B6F1",
            iconBg: "#CCFBF1",
            label: "My Hometown",
            fieldKey: "hometown",
            value: user.hometown,
            placeholder: "Add your hometown",
          })}
          {renderInlineRow({
            icon: "briefcase",
            iconColor: "#38B6F1",
            iconBg: "#CCFBF1",
            label: "My Occupation",
            fieldKey: "occupation",
            value: user.occupation,
            placeholder: "Add your occupation",
          })}
          {renderInlineRow({
            icon: "school",
            iconColor: "#38B6F1",
            iconBg: "#CCFBF1",
            label: "My School",
            fieldKey: "school",
            value: user.school,
            placeholder: "Add your school",
            last: true,
          })}
        </View>

        {/* Other */}
        <Text style={styles.sectionHeader}>Other</Text>
        <View style={styles.card}>
          {renderInlineRow({
            label: "HelloTalk ID",
            fieldKey: "username",
            value: user.username ? `@${user.username}` : undefined,
            placeholder: "Set your ID",
            sub: "3–20 chars: lowercase letters, numbers, _ or . · changeable once a month",
          })}
          <Row
            label="Region"
            value={user.country}
            placeholder="Not set"
            last={false}
          />
          <Row
            label="Gender"
            value={
              user.gender
                ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1)
                : undefined
            }
            placeholder="Choose gender"
            onPress={() => openOptions("gender", "Gender", user.gender, GENDERS)}
          />
          {renderInlineRow({
            label: "Birthday",
            fieldKey: "birthday",
            value: user.birthday,
            placeholder: "Add your birthday",
            sub: "Format: YYYY-MM-DD (e.g. 1998-01-01)",
          })}
          <Row
            label="My Zodiac"
            value={zodiac}
            placeholder="Set birthday to see zodiac"
            last
          />
        </View>

        {/* Paid Practice */}
        <Text style={styles.sectionHeader}>Paid Practice</Text>
        <View style={styles.card}>
          <View style={styles.ppRow}>
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text style={styles.ppLabel}>Offer paid practice</Text>
              <Text style={styles.ppSub}>
                Learners spend coins to unlock a 24-hour practice chat with you.
                You earn the coins.
              </Text>
            </View>
            <Switch
              testID="paid-practice-switch"
              value={!!user.paid_practice}
              onValueChange={togglePaidPractice}
              trackColor={{ true: colors.brand, false: colors.borderStrong }}
              thumbColor="#FFFFFF"
            />
          </View>
          {user.paid_practice && (
            <View style={styles.ppRateRow}>
              <Text style={styles.ppLabel}>Coins per unlock</Text>
              <View style={styles.ppStepper}>
                <Pressable
                  testID="pp-rate-minus"
                  onPress={() => changePracticeRate(-10)}
                  style={styles.ppStepBtn}
                  hitSlop={6}
                >
                  <Ionicons name="remove" size={18} color={colors.onSurface} />
                </Pressable>
                <Text style={styles.ppRateText}>{user.practice_rate ?? 50}</Text>
                <Pressable
                  testID="pp-rate-plus"
                  onPress={() => changePracticeRate(10)}
                  style={styles.ppStepBtn}
                  hitSlop={6}
                >
                  <Ionicons name="add" size={18} color={colors.onSurface} />
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Gift-Gated Messaging */}
        <Text style={styles.sectionHeader}>Gift-Gated Messaging</Text>
        <View style={styles.card}>
          <View style={styles.ppRow}>
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text style={styles.ppLabel}>Require a gift to chat</Text>
              <Text style={styles.ppSub}>
                New people must send you a gift worth at least the amount below
                before they can message you. You keep the coins.
              </Text>
            </View>
            <Switch
              testID="gift-gate-switch"
              value={!!user.gift_gate}
              onValueChange={toggleGiftGate}
              trackColor={{ true: colors.brand, false: colors.borderStrong }}
              thumbColor="#FFFFFF"
            />
          </View>
          {user.gift_gate && (
            <View style={styles.ppRateRow}>
              <Text style={styles.ppLabel}>Minimum gift (coins)</Text>
              <View style={styles.ppStepper}>
                <Pressable
                  testID="gift-min-minus"
                  onPress={() => changeGiftMin(-10)}
                  style={styles.ppStepBtn}
                  hitSlop={6}
                >
                  <Ionicons name="remove" size={18} color={colors.onSurface} />
                </Pressable>
                <Text style={styles.ppRateText}>{user.gift_gate_min ?? 20}</Text>
                <Pressable
                  testID="gift-min-plus"
                  onPress={() => changeGiftMin(10)}
                  style={styles.ppStepBtn}
                  hitSlop={6}
                >
                  <Ionicons name="add" size={18} color={colors.onSurface} />
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          testID="preview-btn"
          style={styles.previewBtn}
          onPress={() => router.push(`/user/${user.id}`)}
        >
          <Text style={styles.previewText}>Preview</Text>
        </Pressable>
        <Pressable
          testID="getvip-btn"
          style={{ flex: 1 }}
          onPress={() => router.push("/market")}
        >
          <LinearGradient
            colors={["#F97316", "#F59E0B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.vipBtn}
          >
            <Text style={styles.vipBtnText}>Get VIP</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* ── Field editor modal ── */}
      <Modal
        visible={!!editor}
        transparent
        animationType="slide"
        onRequestClose={closeEditor}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.editorBackdrop}
        >
          <Pressable style={{ flex: 1 }} onPress={closeEditor} />
          <View style={styles.editorSheet}>
            <View style={styles.editorHandle} />
            <View style={styles.editorHeader}>
              <Pressable onPress={closeEditor} disabled={busy}>
                <Text style={styles.editorCancel}>Cancel</Text>
              </Pressable>
              <Text style={styles.editorTitle}>{editor?.title}</Text>
              <Pressable onPress={commit} disabled={busy}>
                {busy ? (
                  <ActivityIndicator size="small" color={colors.brand} />
                ) : (
                  <Text style={styles.editorSave}>Save</Text>
                )}
              </Pressable>
            </View>
            {editor?.sub ? (
              <Text style={styles.editorSub}>{editor.sub}</Text>
            ) : null}

            <ScrollView
              style={{ maxHeight: 380 }}
              contentContainerStyle={{ paddingBottom: spacing.md }}
              keyboardShouldPersistTaps="handled"
            >
              {(editor?.type === "text" ||
                editor?.type === "textarea" ||
                editor?.type === "birthday" ||
                editor?.type === "username") && (
                <TextInput
                  testID="editor-input"
                  style={[
                    styles.editorInput,
                    editor?.type === "textarea" && styles.editorTextarea,
                  ]}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={editor?.title}
                  placeholderTextColor={colors.onSurfaceSecondary}
                  multiline={editor?.type === "textarea"}
                  autoCapitalize={
                    editor?.type === "username" ? "none" : "sentences"
                  }
                  autoCorrect={editor?.type !== "username"}
                  autoFocus
                />
              )}

              {editor?.type === "options" && (
                <View style={styles.chipWrap}>
                  {editor.choices?.map((c) => {
                    const active = draft === c.value;
                    return (
                      <Pressable
                        key={c.value}
                        testID={`opt-${c.value}`}
                        onPress={() => setDraft(c.value)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            active && styles.chipTextActive,
                          ]}
                        >
                          {c.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {editor?.type === "lang-native" && (
                <View style={styles.chipWrap}>
                  {LANGUAGES.map((lang) => {
                    const active = draft === lang.code;
                    return (
                      <Pressable
                        key={lang.code}
                        onPress={() => setDraft(lang.code)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            active && styles.chipTextActive,
                          ]}
                        >
                          {lang.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {editor?.type === "lang-multi" && (
                <View style={styles.chipWrap}>
                  {LANGUAGES.filter(
                    (l) => !editor.exclude?.includes(l.code),
                  ).map((lang) => {
                    const active = draftArr.includes(lang.code);
                    return (
                      <Pressable
                        key={lang.code}
                        onPress={() => toggleArr(lang.code, editor.cap ?? 3)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            active && styles.chipTextActive,
                          ]}
                        >
                          {lang.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {editor?.type === "interests" && (
                <View style={styles.chipWrap}>
                  {INTERESTS.map((i) => {
                    const active = draftArr.includes(i);
                    return (
                      <Pressable
                        key={i}
                        onPress={() => toggleArr(i, editor.cap ?? MAX_INTERESTS)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            active && styles.chipTextActive,
                          ]}
                        >
                          {i}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {editor?.fieldKey === "learning_languages" &&
                !isVip &&
                editor?.type === "lang-multi" && (
                  <Text style={styles.editorNote}>
                    Free members learn 1 language. Upgrade to VIP for up to 3.
                  </Text>
                )}
            </ScrollView>

            {err ? (
              <Text style={styles.editorError} testID="editor-error">
                {err}
              </Text>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surfaceSecondary,
    },
    coverWrap: {
      height: 184,
      backgroundColor: "#0E9AE0",
      overflow: "hidden",
    },
    coverGlobe: {
      alignItems: "center",
      justifyContent: "center",
    },
    coverBar: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    coverIconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    coverImgBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(0,0,0,0.25)",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarWrap: {
      alignItems: "center",
      marginTop: -46,
    },
    avatarCamBtn: {
      position: "absolute",
      right: -4,
      bottom: 2,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: "#0E9AE0",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: colors.surfaceSecondary,
    },
    sectionHeader: {
      fontFamily: fonts.display,
      fontSize: 18,
      color: colors.onSurface,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
      marginHorizontal: spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      marginHorizontal: spacing.lg,
      paddingHorizontal: spacing.lg,
      ...shadow.card,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.md,
      minHeight: 60,
    },
    ppRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.md,
    },
    ppRateRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.divider,
    },
    ppLabel: {
      fontFamily: fonts.textSemi,
      fontSize: 15,
      color: colors.onSurface,
    },
    ppSub: {
      fontFamily: fonts.text,
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.onSurfaceSecondary,
      marginTop: 2,
    },
    ppStepper: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    ppStepBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    ppRateText: {
      fontFamily: fonts.displaySemi,
      fontSize: 16,
      color: colors.onSurface,
      minWidth: 34,
      textAlign: "center",
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider,
    },
    rowIcon: {
      width: 38,
      height: 38,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
    },
    rowLabel: {
      fontFamily: fonts.text,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
      marginBottom: 2,
    },
    rowValue: {
      fontFamily: fonts.textBold,
      fontSize: 16,
      color: colors.onSurface,
    },
    rowPlaceholder: {
      fontFamily: fonts.text,
      color: colors.onSurfaceSecondary,
    },
    inlineInput: {
      fontFamily: fonts.textBold,
      fontSize: 16,
      color: colors.onSurface,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1.5,
      borderColor: colors.brand,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginTop: 4,
      ...Platform.select({ web: { outlineStyle: "none" } as object, default: {} }),
    },
    inlineTextarea: {
      minHeight: 84,
      textAlignVertical: "top",
      fontFamily: fonts.text,
      fontSize: 15,
      lineHeight: 21,
    },
    inlineSub: {
      fontFamily: fonts.text,
      fontSize: 11.5,
      color: colors.onSurfaceSecondary,
      marginTop: 4,
    },
    inlineErr: {
      fontFamily: fonts.textSemi,
      fontSize: 12,
      color: colors.error,
      marginTop: 4,
    },
    inlineActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    inlineBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
    },
    inlineBtnGhost: {
      backgroundColor: colors.surfaceTertiary,
    },
    voiceRecRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: 4,
    },
    voiceRecDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.error,
    },
    voiceRecText: {
      fontFamily: fonts.textSemi,
      fontSize: 14,
      color: colors.error,
    },
    voiceBubbleWrap: {
      marginTop: 6,
      maxWidth: 220,
    },
    voiceCircleBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
    },
    rowAccent: {
      width: 34,
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.success,
      marginTop: 4,
    },
    levelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.md,
      minHeight: 56,
    },
    levelLabelCol: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    levelFlag: {
      fontSize: 18,
    },
    levelLangName: {
      fontFamily: fonts.textSemi,
      fontSize: 14,
      color: colors.onSurface,
    },
    levelRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    levelDotsRow: {
      flexDirection: "row",
      gap: 4,
    },
    levelDot: {
      width: 9,
      height: 9,
      borderRadius: 4.5,
      backgroundColor: colors.surfaceTertiary,
    },
    levelDotFilled: {
      backgroundColor: colors.brand,
    },
    levelText: {
      fontFamily: fonts.text,
      fontSize: 11.5,
      color: colors.onSurfaceSecondary,
      minWidth: 62,
      textAlign: "right",
    },

    rowDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#EC4899",
    },
    editText: {
      fontFamily: fonts.textBold,
      fontSize: 15,
      color: "#0E9AE0",
    },
    introRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 6,
    },
    vipBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      marginHorizontal: spacing.lg,
      marginTop: spacing.lg,
      paddingVertical: spacing.lg,
      ...shadow.card,
    },
    vipTag: {
      backgroundColor: "#F59E0B",
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    vipTagText: {
      fontFamily: fonts.textBold,
      fontSize: 12,
      color: "#FFFFFF",
      letterSpacing: 0.5,
    },
    vipBannerText: {
      fontFamily: fonts.textBold,
      fontSize: 16,
      color: colors.onSurface,
    },
    bottomBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      backgroundColor: colors.surfaceSecondary,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.divider,
    },
    previewBtn: {
      flex: 1,
      backgroundColor: "#0E9AE0",
      borderRadius: radius.pill,
      paddingVertical: spacing.lg,
      alignItems: "center",
    },
    previewText: {
      fontFamily: fonts.textBold,
      fontSize: 16,
      color: "#FFFFFF",
    },
    vipBtn: {
      borderRadius: radius.pill,
      paddingVertical: spacing.lg,
      alignItems: "center",
    },
    vipBtnText: {
      fontFamily: fonts.textBold,
      fontSize: 16,
      color: "#FFFFFF",
    },
    // Editor
    editorBackdrop: {
      flex: 1,
      backgroundColor: "rgba(15,23,42,0.5)",
      justifyContent: "flex-end",
    },
    editorSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    editorHandle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.borderStrong,
      marginBottom: spacing.sm,
    },
    editorHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    editorTitle: {
      fontFamily: fonts.display,
      fontSize: 17,
      color: colors.onSurface,
    },
    editorCancel: {
      fontFamily: fonts.textSemi,
      fontSize: 15,
      color: colors.onSurfaceSecondary,
    },
    editorSave: {
      fontFamily: fonts.textBold,
      fontSize: 15,
      color: "#0E9AE0",
    },
    editorSub: {
      fontFamily: fonts.text,
      fontSize: 12,
      color: colors.onSurfaceSecondary,
      lineHeight: 17,
    },
    editorInput: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontFamily: fonts.text,
      fontSize: 16,
      color: colors.onSurface,
      marginTop: spacing.sm,
    },
    editorTextarea: {
      minHeight: 110,
      textAlignVertical: "top",
    },
    editorNote: {
      fontFamily: fonts.text,
      fontSize: 12,
      color: colors.onSurfaceSecondary,
      marginTop: spacing.sm,
    },
    editorError: {
      fontFamily: fonts.textSemi,
      fontSize: 13,
      color: colors.error,
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceSecondary,
    },
    chipActive: {
      backgroundColor: colors.brandTertiary,
    },
    chipText: {
      fontFamily: fonts.textSemi,
      fontSize: 14,
      color: colors.onSurfaceTertiary,
    },
    chipTextActive: {
      color: colors.onBrandTertiary,
      fontFamily: fonts.textBold,
    },
  });
