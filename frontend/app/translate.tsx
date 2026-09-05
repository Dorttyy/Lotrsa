import { Ionicons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "@/src/components/BackButton";
import { LANGUAGES } from "@/src/constants/languages";
import { FlagIcon } from "@/src/components/FlagIcon";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { api } from "@/src/utils/api";

const TARGETS = LANGUAGES.slice(0, 12);

export default function Translate() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const [text, setText] = useState("");
  const [target, setTarget] = useState("en");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doTranslate = async () => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post<{ translated: string }>("/ai/translate", {
        text: trimmed,
        target_language: target,
      });
      setResult(res.translated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Translation failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="translate-screen">
      <View style={styles.header}>
        <BackButton testID="translate-back-btn" />
        <Text style={styles.headerTitle}>AI Translation</Text>
        <View style={styles.headerIconBtn} />
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={spacing.lg}
      >
        <Text style={styles.label}>Translate to</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.langRow}
        >
          {TARGETS.map((l) => {
            const active = target === l.code;
            return (
              <Pressable
                key={l.code}
                testID={`translate-lang-${l.code}`}
                onPress={() => setTarget(l.code)}
                style={[styles.langChip, active && styles.langChipActive]}
              >
                <FlagIcon code={l.code} size={22} />
                <Text
                  style={[styles.langText, active && styles.langTextActive]}
                >
                  {l.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.inputCard}>
          <TextInput
            testID="translate-input"
            style={styles.input}
            placeholder="Type or paste text to translate…"
            placeholderTextColor={colors.onSurfaceSecondary}
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
          />
          {text.length > 0 && (
            <Pressable
              testID="translate-clear-btn"
              onPress={() => {
                setText("");
                setResult(null);
                setError(null);
              }}
              style={styles.clearBtn}
              hitSlop={8}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.onSurfaceSecondary}
              />
            </Pressable>
          )}
        </View>

        <Pressable
          testID="translate-submit-btn"
          style={[styles.translateBtn, (!text.trim() || loading) && styles.btnDisabled]}
          onPress={doTranslate}
          disabled={!text.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="language" size={18} color="#FFFFFF" />
              <Text style={styles.translateBtnText}>Translate</Text>
            </>
          )}
        </Pressable>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {result !== null && (
          <View style={styles.resultCard} testID="translate-result">
            <Text style={styles.resultLabel}>Translation</Text>
            <Text style={styles.resultText} selectable>
              {result}
            </Text>
          </View>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider,
    },
    headerIconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontFamily: fonts.display,
      fontSize: 24,
      color: colors.onSurface,
    },
    body: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    label: {
      fontFamily: fonts.textBold,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
    },
    langRow: {
      gap: spacing.sm,
      paddingRight: spacing.lg,
    },
    langChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceSecondary,
    },
    langChipActive: {
      backgroundColor: colors.brandTertiary,
    },
    langFlag: {
      fontSize: 15,
    },
    langText: {
      fontFamily: fonts.textSemi,
      fontSize: 14,
      color: colors.onSurfaceSecondary,
    },
    langTextActive: {
      color: colors.brand,
      fontFamily: fonts.textBold,
    },
    inputCard: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.md,
      padding: spacing.md,
      minHeight: 130,
    },
    input: {
      flex: 1,
      minHeight: 100,
      fontFamily: fonts.text,
      fontSize: 16,
      color: colors.onSurface,
      padding: 0,
    },
    clearBtn: {
      position: "absolute",
      top: spacing.sm,
      right: spacing.sm,
    },
    translateBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingVertical: spacing.md,
    },
    btnDisabled: {
      opacity: 0.5,
    },
    translateBtnText: {
      fontFamily: fonts.textBold,
      fontSize: 16,
      color: "#FFFFFF",
    },
    errorCard: {
      backgroundColor: "#FEF2F2",
      borderRadius: radius.md,
      padding: spacing.md,
    },
    errorText: {
      fontFamily: fonts.textSemi,
      fontSize: 14,
      color: colors.error,
    },
    resultCard: {
      backgroundColor: colors.brandTertiary,
      borderRadius: radius.md,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    resultLabel: {
      fontFamily: fonts.textBold,
      fontSize: 12,
      color: colors.onBrandTertiary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    resultText: {
      fontFamily: fonts.text,
      fontSize: 17,
      lineHeight: 24,
      color: colors.onSurface,
    },
  });
