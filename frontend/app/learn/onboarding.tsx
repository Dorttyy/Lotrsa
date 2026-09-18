import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  useWindowDimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { LANGUAGES } from "@/src/constants/languages";
import { useAuth } from "@/src/context/AuthContext";
import { fonts } from "@/src/theme";
import { api, User } from "@/src/utils/api";
import { learnColors, learnRadius } from "@/src/learn/theme";
import { FlagIcon } from "@/src/components/FlagIcon";
import { SafeAreaView, useSafeAreaInsets } from "@/src/components/layout/SafeAreaView";

// Illustrative emojis stand in for the mascots from the reference design.
// Keeps the module self-contained (no image assets) while preserving the
// playful character.
const SLIDES = [
  {
    key: "anywhere",
    bg: learnColors.onboardingLilac,
    fg: "#1E1030",
    title1: "Learn",
    title2: "Anytime, Easily",
    title3: "Anywhere",
    subtitle: "Build a learning habit and make it part of your day.",
    mascot: "⭐️",
    accent: learnColors.orange,
  },
  {
    key: "speak",
    bg: learnColors.onboardingYellow,
    fg: "#0F0F0F",
    title1: "Speak",
    title2: "With",
    title3: "Confidence",
    subtitle: "Real-time voice practice with native speakers.",
    mascot: "🐰",
    accent: "#111111",
  },
  {
    key: "lessons",
    bg: learnColors.onboardingOrange,
    fg: "#1D0700",
    title1: "Lessons that",
    title2: "work for you",
    title3: "",
    subtitle: "Learn and retain, with a mix of learning styles.",
    mascot: "🎧",
    accent: "#111111",
  },
] as const;

export default function LearnOnboarding() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const width = windowWidth - insets.left - insets.right;
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const { user, setUser } = useAuth();
  const styles = useMemo(() => makeStyles(), []);
  const previousWidth = useRef(width);
  useEffect(() => {
    if (previousWidth.current !== width) {
      scrollRef.current?.scrollTo({ x: index * width, animated: false });
      previousWidth.current = width;
    }
  }, [width, index]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(Math.max(0, Math.min(SLIDES.length - 1, i)));
  };

  const finish = async () => {
    await AsyncStorage.setItem("learn_onboarded_v1", "1");
    router.replace("/learn/dashboard");
  };

  const pickLang = async (code: string) => {
    setLangPickerOpen(false);
    try {
      if (user) {
        const updated = await api.put<User>("/users/me", {
          learning_language: code,
          learning_languages: [code],
        });
        setUser(updated);
      }
    } catch {}
    finish();
  };

  const slide = SLIDES[index];

  return (
    <View style={[styles.root, { backgroundColor: slide.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom", "left", "right"]}>
        <ScrollView
          ref={scrollRef}
          testID="learn-onboarding-pager"
          style={{ flex: 1 }}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          keyboardShouldPersistTaps="handled"
        >
          {SLIDES.map((s) => (
            <ScrollView
              key={s.key}
              testID={`learn-onboarding-slide-${s.key}`}
              style={{ width, backgroundColor: s.bg }}
              contentContainerStyle={styles.slide}
            >
              <View style={styles.textBlock}>
                <View style={styles.titleRow}>
                  <Text style={[styles.heroTitle, { color: s.fg }]}>
                    {s.title1}
                  </Text>
                  {s.key === "anywhere" ? (
                    <Pressable
                      testID="learn-onboarding-language-pill"
                      onPress={() => setLangPickerOpen(true)}
                      style={styles.langPill}
                    >
                      <Text style={styles.langPillText}>Languages</Text>
                      <View style={styles.langArrow}>
                        <Ionicons name="chevron-forward" size={14} color="#FFF" />
                      </View>
                    </Pressable>
                  ) : s.key === "speak" ? (
                    <View style={styles.speakChip}>
                      <SoundBars />
                      <View style={styles.speakMicWrap}>
                        <Ionicons name="mic" size={16} color="#FFF" />
                      </View>
                    </View>
                  ) : null}
                </View>
                {!!s.title2 && (
                  <Text style={[styles.heroTitle, { color: s.fg }]}>
                    {s.title2}
                  </Text>
                )}
                {!!s.title3 && (
                  <Text style={[styles.heroTitle, { color: s.fg }]}>
                    {s.title3}
                  </Text>
                )}
                <Text style={[styles.heroSubtitle, { color: s.fg }]}>
                  {s.subtitle}
                </Text>
              </View>

              {/* Mascot placeholder — big centered emoji */}
              <View style={styles.mascotWrap}>
                <Text style={styles.mascotEmoji}>{s.mascot}</Text>
                <Ionicons
                  name="heart"
                  size={22}
                  color={s.fg}
                  style={styles.floatingHeart}
                />
                <Ionicons
                  name="sparkles"
                  size={20}
                  color={s.fg}
                  style={styles.floatingSparkle}
                />
              </View>
            </ScrollView>
          ))}
        </ScrollView>

        {/* Bottom bar (dots + CTA) */}
        <View style={styles.bottomBar}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: slide.fg + (i === index ? "FF" : "44") },
                ]}
              />
            ))}
          </View>
          <Pressable
            testID="learn-onboarding-cta"
            onPress={() => {
              if (index < SLIDES.length - 1) {
                scrollRef.current?.scrollTo({
                  x: (index + 1) * width,
                  animated: true,
                });
                setIndex(index + 1);
              } else {
                setLangPickerOpen(true);
              }
            }}
            style={[styles.ctaBtn, { backgroundColor: "#0B0B0F" }]}
          >
            <Text style={styles.ctaText}>
              {index < SLIDES.length - 1 ? "Chose a Language" : "Get Started"}
            </Text>
            <View
              style={[styles.ctaArrow, { backgroundColor: slide.accent }]}
            >
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </View>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Language picker sheet */}
      <Modal
        transparent
        visible={langPickerOpen}
        animationType="slide"
        onRequestClose={() => setLangPickerOpen(false)}
      >
        <Pressable
          testID="learn-onboarding-picker-backdrop"
          style={[styles.backdrop, { paddingTop: insets.top + 12, paddingLeft: insets.left, paddingRight: insets.right }]}
          onPress={() => setLangPickerOpen(false)}
        >
          <Pressable
            style={[styles.sheet, { paddingBottom: 30 + insets.bottom }]}
            onPress={(e) => e.stopPropagation?.()}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Choose a language</Text>
            <Text style={styles.sheetSub}>
              You can change this later from the Learn dashboard.
            </Text>
            <ScrollView style={{ maxHeight: 360, flexShrink: 1 }}>
              {LANGUAGES.slice(0, 12).map((l) => (
                <Pressable
                  key={l.code}
                  testID={`learn-onboarding-lang-${l.code}`}
                  onPress={() => pickLang(l.code)}
                  style={styles.langRow}
                >
                  <FlagIcon code={l.code} size={26} />
                  <Text style={styles.langRowName}>{l.name}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#6B6B75" />
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const SoundBars = () => {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      {[10, 18, 14, 20, 12, 16].map((h, i) => (
        <View
          key={i}
          style={{
            width: 3,
            height: h,
            borderRadius: 2,
            backgroundColor: "#111",
          }}
        />
      ))}
    </View>
  );
};

const makeStyles = () =>
  StyleSheet.create({
    root: { flex: 1 },
    slide: {
      flexGrow: 1,
      paddingHorizontal: 28,
      paddingTop: 40,
      paddingBottom: 20,
    },
    textBlock: { gap: 2 },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
    },
    heroTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 38,
      lineHeight: 44,
      letterSpacing: -0.5,
    },
    heroSubtitle: {
      fontFamily: fonts.textSemi,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 12,
      opacity: 0.85,
    },
    langPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#111",
      borderRadius: 999,
      paddingLeft: 14,
      paddingRight: 4,
      paddingVertical: 4,
    },
    langPillText: {
      fontFamily: fonts.textBold,
      color: "#FFFFFF",
      fontSize: 14,
    },
    langArrow: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: learnColors.orange,
      alignItems: "center",
      justifyContent: "center",
    },
    speakChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#111",
      borderRadius: 999,
      paddingLeft: 12,
      paddingRight: 4,
      paddingVertical: 4,
    },
    speakMicWrap: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: learnColors.orange,
      alignItems: "center",
      justifyContent: "center",
    },
    mascotWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 20,
    },
    mascotEmoji: { fontSize: 180 },
    floatingHeart: {
      position: "absolute",
      top: "18%",
      right: "22%",
    },
    floatingSparkle: {
      position: "absolute",
      bottom: "22%",
      left: "18%",
    },
    bottomBar: {
      flexShrink: 0,
      paddingHorizontal: 20,
      paddingBottom: 16,
      gap: 12,
    },
    dots: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 6,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    ctaBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingLeft: 24,
      paddingRight: 8,
      paddingVertical: 10,
      borderRadius: learnRadius.chip,
    },
    ctaText: {
      fontFamily: fonts.textBold,
      color: "#FFFFFF",
      fontSize: 15,
    },
    ctaArrow: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
      maxHeight: "100%",
      flexShrink: 1,
      backgroundColor: learnColors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 30,
    },
    sheetHandle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: learnColors.border,
      marginBottom: 12,
    },
    sheetTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 20,
      color: learnColors.onSurface,
    },
    sheetSub: {
      fontFamily: fonts.textSemi,
      fontSize: 13,
      color: learnColors.onSurfaceSecondary,
      marginBottom: 12,
    },
    langRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: learnColors.border,
    },
    langRowFlag: { fontSize: 22 },
    langRowName: {
      flex: 1,
      fontFamily: fonts.textBold,
      fontSize: 15,
      color: learnColors.onSurface,
    },
  });
