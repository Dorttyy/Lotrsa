import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { WelcomeArtwork } from "@/src/components/welcome/WelcomeArtwork";
import { fonts } from "@/src/theme";
import { Ionicons } from "@/src/ui/icons";

const SLIDES = [
  {
    id: "hello",
    title: "Speak a little.\nConnect a lot.",
    description: "Turn a simple hello into a meaningful exchange. Share your language, your stories, and a little of your world.",
  },
  {
    id: "world",
    title: "Find your people.\nExplore the world.",
    description: "Meet language partners with shared interests. Discover new perspectives, one conversation at a time.",
  },
  {
    id: "voice",
    title: "Your next conversation\nstarts here.",
    description: "Build confidence through everyday practice. From a first message to a voice conversation, make every word count.",
  },
] as const;

type Slide = typeof SLIDES[number];

function IntroSlide({ slide, page, active, width, artSize }: {
  slide: Slide;
  page: number;
  active: boolean;
  width: number;
  artSize: number;
}) {
  const reduceMotion = useReducedMotion();
  const reveal = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    reveal.value = withTiming(active ? 1 : 0, {
      duration: reduceMotion ? 0 : 320,
      easing: Easing.out(Easing.cubic),
    });
  }, [active, reduceMotion, reveal]);
  const artMotion = useAnimatedStyle(() => ({
    opacity: 0.65 + reveal.value * 0.35,
    transform: [{ translateY: (1 - reveal.value) * 12 }],
  }));

  return (
    <View
      style={{ width, flex: 1 }}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? "auto" : "no-hide-descendants"}
      testID={`welcome-slide-${page + 1}`}
    >
      <ScrollView
        contentContainerStyle={styles.slideContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <Animated.View style={[styles.artwork, artMotion]}>
          <WelcomeArtwork page={page} size={artSize} />
        </Animated.View>
        <View style={styles.copy}>
          <Text accessibilityRole="header" style={styles.title} testID={`welcome-title-${page + 1}`}>{slide.title}</Text>
          <Text style={styles.description}>{slide.description}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

/** Three-page public introduction. The required post-signup setup is unchanged. */
export function WelcomeIntroScreen() {
  const router = useRouter();
  const { width: windowWidth, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [page, setPage] = useState(0);
  const [pagerWidth, setPagerWidth] = useState(Math.min(windowWidth, 480));
  const list = useRef<FlatList<Slide>>(null);
  const currentPage = useRef(page);
  currentPage.current = page;
  const artSize = Math.max(160, Math.min(pagerWidth - 40, height * 0.45, 360));

  useEffect(() => {
    list.current?.scrollToOffset({ offset: currentPage.current * pagerWidth, animated: false });
  }, [pagerWidth]);

  const selectPage = useCallback((index: number) => {
    setPage(index);
    list.current?.scrollToOffset({ offset: index * pagerWidth, animated: !reduceMotion });
  }, [pagerWidth, reduceMotion]);

  const finishSwipe = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / pagerWidth);
    setPage(Math.max(0, Math.min(SLIDES.length - 1, next)));
  }, [pagerWidth]);

  return (
    <View style={styles.screen} testID="welcome-screen">
      <StatusBar style="light" />
      <LinearGradient
        colors={["#111722", "#0B1422", "#0C111A"]}
        start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
        <View style={styles.column}>
          <View style={styles.header}>
            <View style={styles.brand}>
              <View style={styles.brandMark}><Ionicons name="chatbubbles" size={19} color="#B6E5FC" /></View>
              <Text style={styles.brandName}>LinguaConnect</Text>
            </View>
            <Text style={styles.pageCounter} testID="welcome-page-count">0{page + 1}<Text style={styles.counterMuted}> / 03</Text></Text>
          </View>
          <FlatList
            ref={list}
            data={SLIDES}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            directionalLockEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            initialNumToRender={3}
            removeClippedSubviews={false}
            style={styles.pager}
            testID="welcome-pager"
            extraData={{ page, pagerWidth, artSize }}
            onLayout={(event) => {
              const measured = event.nativeEvent.layout.width;
              if (measured > 0 && measured !== pagerWidth) setPagerWidth(measured);
            }}
            onMomentumScrollEnd={finishSwipe}
            getItemLayout={(_, index) => ({ length: pagerWidth, offset: pagerWidth * index, index })}
            renderItem={({ item, index }) => (
              <IntroSlide slide={item} page={index} active={page === index} width={pagerWidth} artSize={artSize} />
            )}
          />
          <View style={styles.footer}>
            <View style={styles.pagination} accessibilityLabel="Introduction pages">
              {SLIDES.map((slide, index) => (
                <Pressable
                  key={slide.id}
                  testID={`welcome-page-${index + 1}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Show introduction page ${index + 1} of 3`}
                  accessibilityState={{ selected: page === index }}
                  onPress={() => selectPage(index)}
                  style={styles.pageButton}
                >
                  <View style={[styles.pageTick, page === index && styles.pageTickActive]} />
                </Pressable>
              ))}
            </View>
            <Pressable
              testID="get-started-btn"
              accessibilityRole="button"
              accessibilityHint="Create your LinguaConnect account"
              onPress={() => router.push({ pathname: "/auth", params: { mode: "register" } })}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            >
              <Text style={styles.primaryText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={18} color="#0C1B2D" />
            </Pressable>
            <Pressable
              testID="login-btn"
              accessibilityRole="button"
              accessibilityLabel="Log in to your existing account"
              onPress={() => router.push({ pathname: "/auth", params: { mode: "login" } })}
              style={({ pressed }) => [styles.login, pressed && styles.pressed]}
            >
              <Text style={styles.loginPrompt}>Already have an account? <Text style={styles.loginLink}>Log in</Text></Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0B1220" },
  safeArea: { flex: 1 },
  column: { flex: 1, width: "100%", maxWidth: 480, alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12, minHeight: 68 },
  brand: { flexDirection: "row", alignItems: "center", gap: 9, flexShrink: 1 },
  brandMark: { width: 31, height: 31, borderRadius: 11, backgroundColor: "#15304A", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#31516D" },
  brandName: { fontFamily: fonts.displaySemi, fontSize: 18, color: "#F3F6FC", letterSpacing: -0.4, flexShrink: 1 },
  pageCounter: { fontFamily: fonts.textSemi, fontSize: 11, color: "#ADCCE4", letterSpacing: 1.3 },
  counterMuted: { color: "#566B81" },
  pager: { flex: 1 },
  slideContent: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 },
  artwork: { marginBottom: 26, alignItems: "center" },
  copy: { gap: 13, width: "100%", maxWidth: 366 },
  title: { fontFamily: fonts.displayBold, fontSize: 27, lineHeight: 35, textAlign: "center", letterSpacing: -0.7, color: "#F6F8FC" },
  description: { fontFamily: fonts.text, fontSize: 14, lineHeight: 22, color: "#A2B0C2", textAlign: "center", paddingHorizontal: 4 },
  footer: { paddingHorizontal: 32, paddingBottom: 8, paddingTop: 2 },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 7 },
  pageButton: { width: 48, height: 44, alignItems: "center", justifyContent: "center" },
  pageTick: { width: 3, height: 11, borderRadius: 2, backgroundColor: "#526074" },
  pageTickActive: { height: 22, backgroundColor: "#43B6F1" },
  primary: { minHeight: 56, paddingVertical: 15, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#F8FBFF", borderRadius: 18, borderWidth: 1, borderColor: "#D9E8F5", boxShadow: "0px 5px 18px rgba(0,0,0,0.16)" },
  primaryText: { fontFamily: fonts.textBold, fontSize: 16, color: "#0C1B2D" },
  login: { minHeight: 48, alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  loginPrompt: { fontFamily: fonts.text, fontSize: 12.5, color: "#91A1B5", textAlign: "center" },
  loginLink: { fontFamily: fonts.textBold, color: "#66C8FA" },
  pressed: { opacity: 0.8 },
});
