import { Ionicons, MaterialCommunityIcons } from "@/src/ui/icons";
import { TranslationIcon } from "@/src/ui/TranslationIcon";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { api, assetUrl } from "@/src/utils/api";
import { useAuth } from "@/src/context/AuthContext";

/**
 * "Select Text" — OCR the photo, lay every word out as neat selectable chips
 * (row per original line), with Select All · Translate · Forward · Copy ·
 * Favorite actions at the bottom (HelloTalk style).
 */

const notify = (title: string, message: string) => {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
};

export default function SelectText() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ uri?: string; mediaId?: string }>();
  const uri = params.uri ? decodeURIComponent(params.uri) : null;
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<string[][]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [translation, setTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    if (!params.mediaId) {
      setLoading(false);
      return;
    }
    api
      .post<{ text: string }>("/ai/image-text", { media_id: params.mediaId })
      .then((res) => {
        const rows = (res.text || "")
          .split(/\n+/)
          .map((l) => l.trim().split(/\s+/).filter(Boolean))
          .filter((r) => r.length > 0);
        setLines(rows);
      })
      .catch((e) =>
        notify(
          "Select Text",
          e instanceof Error ? e.message : "Could not read this photo.",
        ),
      )
      .finally(() => setLoading(false));
  }, [params.mediaId]);

  const keyOf = (r: number, c: number) => `${r}:${c}`;
  const allKeys = useMemo(
    () => lines.flatMap((row, r) => row.map((_, c) => keyOf(r, c))),
    [lines],
  );
  const selectedText = useMemo(
    () =>
      lines
        .map((row, r) =>
          row.filter((_, c) => selected.has(keyOf(r, c))).join(" "),
        )
        .filter(Boolean)
        .join("\n"),
    [lines, selected],
  );
  const hasSelection = selected.size > 0;

  const toggle = (k: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const selectAll = () =>
    setSelected((prev) =>
      prev.size === allKeys.length ? new Set() : new Set(allKeys),
    );

  const translate = async () => {
    if (!hasSelection || translating) return;
    setTranslating(true);
    try {
      const res = await api.post<{ translated: string }>("/ai/translate", {
        text: selectedText,
        target_language: user?.native_language || "en",
      });
      setTranslation(res.translated);
    } catch (e) {
      notify("Translate", e instanceof Error ? e.message : "Could not translate.");
    } finally {
      setTranslating(false);
    }
  };

  const copy = async () => {
    if (!hasSelection) return;
    await Clipboard.setStringAsync(selectedText);
    notify("Copied", "Selected text copied to clipboard.");
  };

  const forward = async () => {
    if (!hasSelection) return;
    try {
      await Share.share({ message: selectedText });
    } catch {
      /* dismissed */
    }
  };

  return (
    <View style={styles.root} testID="select-text-screen">
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        {/* Photo strip */}
        <View style={styles.photoArea}>
          {uri && (
            <Image
              source={{ uri: assetUrl(uri) || uri }}
              style={styles.photo}
              contentFit="contain"
            />
          )}
          <Pressable
            testID="select-text-expand"
            style={styles.expandBtn}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <Ionicons name="expand" size={17} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Sheet */}
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Pressable
              testID="select-text-close"
              onPress={() => router.back()}
              hitSlop={10}
            >
              <Ionicons name="close" size={24} color="#1F2430" />
            </Pressable>
            <Text style={styles.sheetTitle}>Select Text</Text>
            <View style={{ width: 24 }} />
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#0E9AE0" />
              <Text style={styles.loadingText}>Reading the photo…</Text>
            </View>
          ) : lines.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.loadingText}>
                No readable text found in this photo.
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.chipArea}
              showsVerticalScrollIndicator={false}
            >
              {lines.map((row, r) => (
                <View key={r} style={styles.chipRow}>
                  {row.map((w, c) => {
                    const k = keyOf(r, c);
                    const on = selected.has(k);
                    return (
                      <Pressable
                        key={k}
                        testID={`word-chip-${r}-${c}`}
                        style={[styles.chip, on && styles.chipOn]}
                        onPress={() => toggle(k)}
                      >
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>
                          {w}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
              {translation ? (
                <View style={styles.translationBox} testID="select-text-translation">
                  <Ionicons name="language" size={14} color="#0E9AE0" />
                  <Text style={styles.translationText}>{translation}</Text>
                </View>
              ) : null}
            </ScrollView>
          )}

          {/* Bottom actions */}
          <View style={styles.actionsBar}>
            <Pressable
              testID="select-text-selectall"
              style={styles.actionBtn}
              onPress={selectAll}
            >
              <MaterialCommunityIcons
                name="order-bool-ascending-variant"
                size={23}
                color="#1F2430"
              />
              <Text style={styles.actionLabel}>Select All</Text>
            </Pressable>
            <Pressable
              testID="select-text-translate"
              style={styles.actionBtn}
              onPress={translate}
              disabled={!hasSelection}
            >
              {translating ? (
                <ActivityIndicator size="small" color="#0E9AE0" />
              ) : (
                <TranslationIcon testID="select-text-translate-icon" size={23}
                  color={hasSelection ? "#1F2430" : "#C4C4CC"} />
              )}
              <Text style={[styles.actionLabel, !hasSelection && styles.dim]}>
                Translate
              </Text>
            </Pressable>
            <Pressable
              testID="select-text-forward"
              style={styles.actionBtn}
              onPress={forward}
              disabled={!hasSelection}
            >
              <Ionicons
                name="arrow-redo-outline"
                size={22}
                color={hasSelection ? "#1F2430" : "#C4C4CC"}
              />
              <Text style={[styles.actionLabel, !hasSelection && styles.dim]}>
                Forward
              </Text>
            </Pressable>
            <Pressable
              testID="select-text-copy"
              style={styles.actionBtn}
              onPress={copy}
              disabled={!hasSelection}
            >
              <Ionicons
                name="copy-outline"
                size={21}
                color={hasSelection ? "#1F2430" : "#C4C4CC"}
              />
              <Text style={[styles.actionLabel, !hasSelection && styles.dim]}>
                Copy
              </Text>
            </Pressable>
            <Pressable
              testID="select-text-favorite"
              style={styles.actionBtn}
              onPress={() =>
                hasSelection && notify("Favorite", "Saved words are coming soon!")
              }
              disabled={!hasSelection}
            >
              <Ionicons
                name="bookmark-outline"
                size={21}
                color={hasSelection ? "#1F2430" : "#C4C4CC"}
              />
              <Text style={[styles.actionLabel, !hasSelection && styles.dim]}>
                Favorite
              </Text>
            </Pressable>
          </View>
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
  photoArea: {
    height: 250,
    alignItems: "center",
    justifyContent: "center",
  },
  photo: {
    width: "60%",
    height: "92%",
  },
  expandBtn: {
    position: "absolute",
    right: 16,
    bottom: 12,
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sheetTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 14.5,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 30,
  },
  chipArea: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 16,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#F3F3F6",
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  chipOn: {
    backgroundColor: "#0E9AE0",
  },
  chipText: {
    fontSize: 15.5,
    color: "#1F2430",
  },
  chipTextOn: {
    color: "#FFFFFF",
  },
  translationBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#F5F2FF",
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
  },
  translationText: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 21,
    color: "#3B3568",
  },
  actionsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E7E7EC",
    paddingVertical: 12,
  },
  actionBtn: {
    alignItems: "center",
    gap: 4,
    minWidth: 60,
  },
  actionLabel: {
    fontSize: 12,
    color: "#1F2430",
  },
  dim: {
    color: "#C4C4CC",
  },
});
