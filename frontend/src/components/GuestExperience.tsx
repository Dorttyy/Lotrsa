import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { LANGUAGES } from "@/src/constants/languages";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { Ionicons } from "@/src/ui/icons";
import { canGuestOpenRootRoute } from "@/src/utils/guest-access";

type Section = "connect" | "chats" | "moments" | "voice" | "profile" | "restricted";
type IconName = React.ComponentProps<typeof Ionicons>["name"];

const SECTIONS: Record<Section, { label: string; icon: IconName; title: string; description: string }> = {
  connect: {
    label: "Connect",
    icon: "earth-outline",
    title: "Your next connection starts here.",
    description: "Explore the language directory below. Sign in to discover real language partners and start a conversation.",
  },
  chats: {
    label: "Chats",
    icon: "chatbubbles-outline",
    title: "Conversations belong to you.",
    description: "Log in to view your messages, send voice notes, and keep in touch with language partners. Private conversations are never shown in guest mode.",
  },
  moments: {
    label: "Moments",
    icon: "planet-outline",
    title: "Learn from the community.",
    description: "Community posts, reactions, and saved moments require an account. No live feed is loaded while you browse as a guest.",
  },
  voice: {
    label: "Voice Rooms",
    icon: "mic-outline",
    title: "Make room for conversation.",
    description: "Sign in to see live rooms, join speakers, or start an audio call. Guest mode does not connect your microphone or simulate a live room.",
  },
  profile: {
    label: "Me",
    icon: "person-outline",
    title: "Welcome, guest.",
    description: "You are browsing without an account. Your profile, language preferences, and progress become available after you sign in.",
  },
  restricted: {
    label: "Account required",
    icon: "lock-closed-outline",
    title: "This space needs an account.",
    description: "Your guest session cannot access personal information or account actions. Log in, create an account, or return to exploring.",
  },
};

/** Public routes stay usable even if restoring an old account is still pending. */
export function GuestRouteBoundary({ name, children }: { name: string; children: React.ReactNode }) {
  const { isGuestBrowsing, loading } = useAuth();
  const { colors } = useTheme();
  if (["index", "welcome", "auth"].includes(name)) return <>{children}</>;
  if (loading) {
    return (
      <View style={[base.loading, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.brand} accessibilityLabel="Loading session" />
      </View>
    );
  }
  if (isGuestBrowsing && !canGuestOpenRootRoute(name)) {
    return <GuestTabScreen section="restricted" />;
  }
  return <>{children}</>;
}

export function GuestTabBoundary({ name, children }: { name: string; children: React.ReactNode }) {
  const { isGuestBrowsing } = useAuth();
  return isGuestBrowsing ? <GuestTabScreen section={name} /> : <>{children}</>;
}

/** Intentional unauthenticated states, not mock member screens or seeded content. */
function GuestTabScreen({ section }: { section: string }) {
  const current: Section = Object.prototype.hasOwnProperty.call(SECTIONS, section)
    ? section as Section
    : "restricted";
  const content = SECTIONS[current];
  const { logout } = useAuth();
  const { colors, mode, toggleMode } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState("");
  const languages = useMemo(() => {
    const term = query.trim().toLowerCase();
    return LANGUAGES.filter((language) =>
      language.name.toLowerCase().includes(term) || language.code.includes(term),
    );
  }, [query]);

  const openAuth = (authMode: "login" | "register") => {
    Keyboard.dismiss();
    router.push({ pathname: "/auth", params: { mode: authMode } });
  };
  const exitGuest = async () => {
    Keyboard.dismiss();
    await logout();
    router.replace("/welcome");
  };

  return (
    <SafeAreaView
      edges={current === "restricted" ? ["top", "bottom", "left", "right"] : ["top", "left", "right"]}
      style={styles.screen}
      testID={`guest-${current}-screen`}
    >
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.headerTitle}>{content.label}</Text>
        <View style={styles.badge} testID="guest-mode-badge">
          <Ionicons name="compass-outline" size={15} color={colors.brand} />
          <Text style={styles.badgeText}>Guest mode</Text>
        </View>
      </View>
      <KeyboardAvoidingView
        style={base.flex}
        behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: spacing.xl + (current === "restricted" ? 0 : insets.bottom) }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name={content.icon} size={32} color={colors.brand} />
            </View>
            <Text style={styles.eyebrow}>EXPLORE AT YOUR OWN PACE</Text>
            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.description}>{content.description}</Text>
            <View style={styles.authActions}>
              <Pressable
                accessibilityRole="button"
                testID={`guest-${current}-signup-btn`}
                onPress={() => openAuth("register")}
                style={({ pressed }) => [styles.primaryButton, pressed && base.pressed]}
              >
                <Text style={styles.primaryLabel}>Create an account</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.onBrand} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                testID={`guest-${current}-login-btn`}
                onPress={() => openAuth("login")}
                style={({ pressed }) => [styles.secondaryButton, pressed && base.pressed]}
              >
                <Text style={styles.secondaryLabel}>Log in</Text>
              </Pressable>
            </View>
          </View>

          {current === "connect" && (
            <View style={styles.directory}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Explore languages</Text>
              <Text style={styles.caption}>This directory is available offline. It is not a list of online users.</Text>
              <View style={styles.search}>
                <Ionicons name="search" size={18} color={colors.onSurfaceSecondary} />
                <TextInput
                  testID="guest-language-search"
                  accessibilityLabel="Search language directory"
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Find a language"
                  placeholderTextColor={colors.onSurfaceSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={Keyboard.dismiss}
                  style={styles.searchInput}
                />
                {!!query && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear language search"
                    testID="guest-language-clear"
                    onPress={() => setQuery("")}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.onSurfaceSecondary} />
                  </Pressable>
                )}
              </View>
              <View style={styles.languageGrid}>
                {languages.map((language) => (
                  <View key={language.code} style={styles.language} testID={`guest-language-${language.code}`}>
                    <View style={styles.languageCode}>
                      <Text style={styles.languageCodeText}>{language.code.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.languageName}>{language.name}</Text>
                  </View>
                ))}
              </View>
              {!languages.length && <Text style={styles.caption}>No language matches. Try another name or code.</Text>}
            </View>
          )}

          {current === "profile" && (
            <View style={styles.directory}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Make yourself comfortable</Text>
              <Pressable
                accessibilityRole="switch"
                accessibilityLabel="Dark mode"
                accessibilityState={{ checked: mode === "dark" }}
                testID="guest-theme-toggle"
                onPress={toggleMode}
                style={({ pressed }) => [styles.settingRow, pressed && base.pressed]}
              >
                <Ionicons name={mode === "dark" ? "moon" : "sunny"} size={22} color={colors.brand} />
                <View style={base.flex}>
                  <Text style={styles.settingTitle}>Appearance</Text>
                  <Text style={styles.caption}>{mode === "dark" ? "Dark mode" : "Light mode"} · tap to switch</Text>
                </View>
                <Ionicons name="swap-horizontal" size={20} color={colors.brand} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                testID="guest-exit-btn"
                onPress={exitGuest}
                style={({ pressed }) => [styles.settingRow, pressed && base.pressed]}
              >
                <Ionicons name="log-out-outline" size={22} color={colors.onSurfaceSecondary} />
                <Text style={styles.settingTitle}>Exit guest mode</Text>
              </Pressable>
            </View>
          )}

          {current !== "connect" && current !== "profile" && (
            <Pressable
              accessibilityRole="button"
              testID={`guest-${current}-explore-btn`}
              onPress={() => router.replace("/(tabs)/connect")}
              style={({ pressed }) => [styles.exploreButton, pressed && base.pressed]}
            >
              <Ionicons name="compass-outline" size={21} color={colors.brand} />
              <Text style={styles.secondaryLabel}>Explore the language directory</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.brand} />
            </Pressable>
          )}

          <View style={styles.notice}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.onSurfaceSecondary} />
            <Text style={styles.noticeText}>No account has been created. Guest browsing works without the server; live community features need a working connection and sign-in.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const base = StyleSheet.create({
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.75 },
});

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.surface },
  headerTitle: { fontFamily: fonts.displayBold, fontSize: 24, color: colors.onSurface },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.brandTertiary, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  badgeText: { fontFamily: fonts.textBold, fontSize: 12, color: colors.brand },
  scroll: { flexGrow: 1, padding: spacing.lg, gap: spacing.lg, width: "100%", maxWidth: 760, alignSelf: "center" },
  hero: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, padding: spacing.xl, gap: spacing.md },
  heroIcon: { width: 64, height: 64, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: colors.brandTertiary },
  eyebrow: { color: colors.brand, fontFamily: fonts.textBold, fontSize: 10.5, letterSpacing: 1.1 },
  title: { fontFamily: fonts.displayBold, fontSize: 27, lineHeight: 34, color: colors.onSurface },
  description: { fontFamily: fonts.text, fontSize: 14, lineHeight: 22, color: colors.onSurfaceSecondary },
  authActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
  primaryButton: { flexGrow: 1, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: radius.pill, backgroundColor: colors.brand },
  primaryLabel: { fontFamily: fonts.textBold, fontSize: 14, color: colors.onBrand },
  secondaryButton: { minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.divider },
  secondaryLabel: { fontFamily: fonts.textBold, fontSize: 14, color: colors.brand, flexShrink: 1 },
  directory: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, gap: spacing.md },
  sectionTitle: { fontFamily: fonts.displaySemi, fontSize: 18, color: colors.onSurface },
  caption: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: colors.onSurfaceSecondary },
  search: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, paddingLeft: spacing.md },
  searchInput: { flex: 1, minWidth: 0, minHeight: 48, fontFamily: fonts.text, fontSize: 14, color: colors.onSurface, paddingVertical: spacing.sm, paddingRight: spacing.sm },
  clearButton: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  languageGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  language: { flexBasis: "45%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 48, paddingVertical: spacing.sm },
  languageCode: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  languageCodeText: { fontFamily: fonts.textBold, color: colors.brand, fontSize: 11 },
  languageName: { fontFamily: fonts.textSemi, fontSize: 13, color: colors.onSurface, flexShrink: 1 },
  settingRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 56, paddingVertical: spacing.sm },
  settingTitle: { fontFamily: fonts.textSemi, fontSize: 15, color: colors.onSurface },
  exploreButton: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, padding: spacing.lg, minHeight: 56, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingHorizontal: spacing.xs, paddingBottom: spacing.sm },
  noticeText: { flex: 1, fontFamily: fonts.text, fontSize: 11.5, lineHeight: 18, color: colors.onSurfaceSecondary },
});
