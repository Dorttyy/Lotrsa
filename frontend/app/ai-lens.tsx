import { Ionicons, MaterialCommunityIcons } from "@/src/ui/icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Speech from "expo-speech";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { langName } from "@/src/constants/languages";
import { useAuth } from "@/src/context/AuthContext";
import { api, assetUrl } from "@/src/utils/api";
import { SafeAreaView, useSafeAreaInsets } from "@/src/components/layout/SafeAreaView";
import { BoundedSheet } from "@/src/components/layout/BoundedSheet";

const LANG_CYCLE = ["en", "es", "fr", "de", "ja", "ko", "zh", "ar", "hi", "bn", "pt", "ru"];

/**
 * AI Lens (HelloTalk style) — flow:
 *   1. confirm  : dim purple backdrop, photo, crop/✓/sliders sheet
 *   2. scanning : a light beam sweeps top→bottom over the photo
 *   3. result   : white flashcard (photo, /pron/ 🔊, native word, learning word)
 *   4. details  : flips to meanings + example sentence card
 */

interface LensResult {
  native_word: string;
  learning_word: string;
  pron: string;
  pos: string;
  example_native: string;
  example_learning: string;
  native_language: string;
  learning_language: string;
}

const notify = (title: string, message: string) => {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
};

const SCAN_HEIGHT = 420;

function ScanBeam() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [t]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: t.value * (SCAN_HEIGHT - 4) }],
  }));
  return (
    <Animated.View style={[styles.scanBeam, style]} testID="ai-lens-beam">
      <View style={styles.scanLine} />
      <View style={styles.scanGlow} />
    </Animated.View>
  );
}

export default function AiLens() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ uri?: string; mediaId?: string }>();
  const uri = params.uri ? decodeURIComponent(params.uri) : null;
  const [stage, setStage] = useState<"confirm" | "scanning" | "result" | "details">(
    "confirm",
  );
  const [result, setResult] = useState<LensResult | null>(null);
  // Language Settings sheet (VIP can change the lens languages)
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bigLang, setBigLang] = useState(user?.native_language || "en");
  const [smallLang, setSmallLang] = useState(
    user?.learning_languages?.[0] || user?.learning_language || "en",
  );

  const cycleLang = (which: "big" | "small") => {
    if (!user?.is_vip) {
      notify("VIP feature", "Changing lens languages is a VIP feature. Upgrade to unlock it!");
      return;
    }
    const cur = which === "big" ? bigLang : smallLang;
    const next = LANG_CYCLE[(LANG_CYCLE.indexOf(cur) + 1) % LANG_CYCLE.length];
    if (which === "big") setBigLang(next);
    else setSmallLang(next);
  };

  const scan = async () => {
    if (!params.mediaId) {
      notify("AI Lens", "This photo can't be scanned.");
      return;
    }
    setStage("scanning");
    try {
      const res = await api.post<LensResult>("/ai/image-lens", {
        media_id: params.mediaId,
        native_language: bigLang,
        learning_language: smallLang,
      });
      setResult(res);
      setStage("result");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI is unavailable right now.";
      if (msg.includes("VIP") || msg.includes("Free users")) {
        if (Platform.OS === "web") {
          if (window.confirm(`${msg}\n\nUpgrade to VIP now?`)) {
            router.push("/premium");
          }
        } else {
          Alert.alert("Daily limit reached", msg, [
            { text: "Not now", style: "cancel" },
            { text: "Upgrade", onPress: () => router.push("/premium") },
          ]);
        }
      } else {
        notify("AI Lens", msg);
      }
      setStage("confirm");
    }
  };

  const speak = () => {
    if (!result) return;
    try {
      Speech.speak(result.native_word, { language: result.native_language });
    } catch {
      /* tts unavailable */
    }
  };

  const shareCard = async () => {
    if (!result) return;
    try {
      await Share.share({
        message: `${result.native_word} — ${result.learning_word}\n${result.example_learning}`,
      });
    } catch {
      /* dismissed */
    }
  };

  const isDark = stage === "confirm" || stage === "scanning";

  return (
    <View style={[styles.root, { backgroundColor: isDark ? "#6E6A80" : "#F4F4F6" }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            testID="ai-lens-back"
            onPress={() =>
              stage === "details" ? setStage("result") : router.back()
            }
            hitSlop={10}
          >
            <Ionicons
              name="chevron-back"
              size={26}
              color={isDark ? "#FFFFFF" : "#1F2430"}
            />
          </Pressable>
          <View style={{ flex: 1 }} />
          {isDark ? (
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
          ) : (
            <Ionicons name="grid" size={20} color="#1F2430" />
          )}
        </View>

        {isDark ? (
          <>
            {/* Photo + scan beam */}
            <View style={styles.photoArea}>
              <View style={styles.photoFrame}>
                {uri && (
                  <Image
                    source={{ uri: assetUrl(uri) || uri }}
                    style={styles.photo}
                    contentFit="contain"
                  />
                )}
                {stage === "scanning" && <ScanBeam />}
              </View>
            </View>

            {/* Bottom sheet: crop / confirm / sliders */}
            <View style={styles.sheet}>
              <Pressable
                testID="ai-lens-crop"
                style={styles.sideBtn}
                onPress={() => notify("Crop", "Cropping is coming soon!")}
              >
                <Ionicons name="crop" size={22} color="#1F2430" />
              </Pressable>
              <Pressable
                testID="ai-lens-confirm"
                style={[styles.confirmBtn, stage === "scanning" && { opacity: 0.6 }]}
                onPress={scan}
                disabled={stage === "scanning"}
              >
                {stage === "scanning" ? (
                  <MaterialCommunityIcons name="magnify-scan" size={28} color="#FFFFFF" />
                ) : (
                  <Ionicons name="checkmark" size={30} color="#FFFFFF" />
                )}
              </Pressable>
              <Pressable
                testID="ai-lens-sliders"
                style={styles.sideBtn}
                onPress={() => setSettingsOpen(true)}
              >
                <Ionicons name="options" size={22} color="#1F2430" />
              </Pressable>
            </View>
          </>
        ) : (
          <>
            {/* Result / details flashcard */}
            <View style={styles.cardArea}>
              {stage === "result" && result ? (
                <Pressable
                  testID="ai-lens-card"
                  style={styles.card}
                  onPress={() => setStage("details")}
                >
                  {uri && (
                    <Image
                      source={{ uri: assetUrl(uri) || uri }}
                      style={styles.cardImage}
                      contentFit="contain"
                    />
                  )}
                  <View style={styles.pronRow}>
                    {!!result.pron && (
                      <Text style={styles.pron}>/{result.pron.replace(/^\/|\/$/g, "")}/</Text>
                    )}
                    <Pressable testID="ai-lens-speak" onPress={speak} hitSlop={8}>
                      <Ionicons name="volume-medium" size={20} color="#1F2430" />
                    </Pressable>
                  </View>
                  <Text style={styles.nativeWord}>{result.native_word}</Text>
                  <Text style={styles.learningWord}>{result.learning_word}</Text>
                  <Text style={styles.hint}>Click to view details</Text>
                </Pressable>
              ) : stage === "details" && result ? (
                <View style={styles.card} testID="ai-lens-details">
                  <Text style={styles.posLine}>{result.pos || result.learning_word}</Text>
                  <Text style={styles.exampleLabel}>Example Sentence</Text>
                  <Text style={styles.exampleNative}>{result.example_native}</Text>
                  <Text style={styles.exampleLearning}>{result.example_learning}</Text>
                  <View style={{ flex: 1 }} />
                  <Pressable
                    testID="ai-lens-back-card"
                    onPress={() => setStage("result")}
                    hitSlop={8}
                  >
                    <Text style={styles.backText}>Back</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            {/* Bottom controls: rescan / share / sliders */}
            <View style={styles.resultBar}>
              <Pressable
                testID="ai-lens-rescan"
                style={styles.roundWhite}
                onPress={() => {
                  setResult(null);
                  setStage("confirm");
                }}
              >
                <Ionicons name="refresh" size={22} color="#1F2430" />
              </Pressable>
              <Pressable
                testID="ai-lens-share"
                style={styles.confirmBtn}
                onPress={shareCard}
              >
                <Ionicons name="arrow-redo" size={26} color="#FFFFFF" />
              </Pressable>
              <Pressable
                style={styles.roundWhite}
                onPress={() => setSettingsOpen(true)}
              >
                <Ionicons name="options" size={22} color="#1F2430" />
              </Pressable>
            </View>
          </>
        )}
        {/* Language Settings sheet */}
        <Modal
          visible={settingsOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setSettingsOpen(false)}
        >
          <Pressable
            style={styles.lsBackdrop}
            onPress={() => setSettingsOpen(false)}
          />
          <BoundedSheet style={[styles.lsSheet, { paddingBottom: 30 + insets.bottom }]} testID="ai-lens-lang-sheet">
            <Text style={styles.lsTitle}>Language Settings</Text>
            <View style={styles.lsCard}>
              <Pressable
                testID="ai-lens-lang-learning"
                style={styles.lsRow}
                onPress={() => cycleLang("big")}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.lsLabelRow}>
                    <Text style={styles.lsLabel}>Learning</Text>
                    <View style={styles.vipChip}>
                      <Text style={styles.vipChipText}>VIP</Text>
                    </View>
                  </View>
                  <Text style={styles.lsDesc}>
                    Display recognized content from the image in this language
                    first.
                  </Text>
                </View>
                <Text style={styles.lsValue}>{langName(bigLang)}</Text>
                <Ionicons name="chevron-forward" size={17} color="#0E9AE0" />
              </Pressable>
              <View style={styles.lsDivider} />
              <Pressable
                testID="ai-lens-lang-target"
                style={styles.lsRow}
                onPress={() => cycleLang("small")}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.lsLabelRow}>
                    <Text style={styles.lsLabel}>Target Language</Text>
                    <View style={styles.vipChip}>
                      <Text style={styles.vipChipText}>VIP</Text>
                    </View>
                  </View>
                  <Text style={styles.lsDesc}>
                    Prioritize displaying content in this language.
                  </Text>
                </View>
                <Text style={styles.lsValue}>{langName(smallLang)}</Text>
                <Ionicons name="chevron-forward" size={17} color="#0E9AE0" />
              </Pressable>
            </View>
            <Pressable
              testID="ai-lens-lang-confirm"
              style={styles.lsConfirm}
              onPress={() => setSettingsOpen(false)}
            >
              <Text style={styles.lsConfirmText}>Confirm</Text>
            </Pressable>
          </BoundedSheet>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  lsBackdrop: {
    flex: 1,
    backgroundColor: "rgba(10,8,20,0.55)",
  },
  lsSheet: {
    backgroundColor: "#F7F7F9",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    paddingBottom: 30,
  },
  lsTitle: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 16,
  },
  lsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  lsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  lsLabelRow: {
    flexWrap: "wrap",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  lsLabel: {
    fontSize: 16.5,
    fontWeight: "800",
    color: "#111827",
  },
  vipChip: {
    backgroundColor: "#F5A623",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  vipChipText: {
    fontSize: 9.5,
    fontWeight: "900",
    color: "#FFFFFF",
    fontStyle: "italic",
  },
  lsDesc: {
    fontSize: 13,
    color: "#8A8A93",
    marginTop: 4,
    lineHeight: 18,
    paddingRight: 8,
  },
  lsValue: {
    fontSize: 15.5,
    fontWeight: "600",
    color: "#0E9AE0",
  },
  lsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#ECECF1",
  },
  lsConfirm: {
    backgroundColor: "#0E9AE0",
    borderRadius: 28,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  lsConfirmText: {
    fontSize: 16.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  aiBadge: {
    borderWidth: 1.8,
    borderColor: "#FFFFFF",
    borderRadius: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  aiBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  photoArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  photoFrame: {
    width: "100%",
    height: SCAN_HEIGHT,
    overflow: "hidden",
    borderRadius: 8,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  scanBeam: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
  },
  scanLine: {
    height: 3,
    backgroundColor: "#38B6F1",
    borderRadius: 2,
    shadowColor: "#0E9AE0",
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  scanGlow: {
    height: 46,
    backgroundColor: "rgba(16,185,129,0.18)",
  },
  sheet: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingVertical: 26,
    paddingHorizontal: 30,
  },
  sideBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F1F1F4",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtn: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#0E9AE0",
    alignItems: "center",
    justifyContent: "center",
  },
  cardArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  card: {
    width: "100%",
    minHeight: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cardImage: {
    width: 200,
    height: 210,
    marginBottom: 14,
  },
  pronRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pron: {
    fontSize: 15,
    color: "#6B7280",
  },
  nativeWord: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
    marginTop: 6,
  },
  learningWord: {
    fontSize: 16.5,
    color: "#374151",
    marginTop: 8,
  },
  hint: {
    fontSize: 13.5,
    color: "#9CA3AF",
    marginTop: 16,
  },
  posLine: {
    alignSelf: "flex-start",
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  exampleLabel: {
    alignSelf: "flex-start",
    fontSize: 15.5,
    fontWeight: "800",
    color: "#111827",
    marginTop: 18,
  },
  exampleNative: {
    alignSelf: "stretch",
    textAlign: "right",
    fontSize: 15,
    color: "#111827",
    marginTop: 10,
  },
  exampleLearning: {
    alignSelf: "flex-start",
    fontSize: 15,
    color: "#374151",
    marginTop: 8,
  },
  backText: {
    fontSize: 14.5,
    color: "#9CA3AF",
  },
  resultBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 22,
    paddingHorizontal: 30,
  },
  roundWhite: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
});
