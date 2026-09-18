import { Ionicons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { fonts } from "@/src/theme";
import { api } from "@/src/utils/api";
import { learnColors } from "@/src/learn/theme";

interface VocabItem {
  id: string;
  word: string;
  meaning: string;
  level: string | null;
  language: string;
  seen: boolean;
  streak: number;
  last_result: string | null;
}

export default function LearnVocabulary() {
  const router = useRouter();
  const [items, setItems] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await api.get<VocabItem[]>("/learn/vocabulary");
        setItems(list);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.title}>All Items</Text>
        <View style={{ width: 30 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={learnColors.yellow} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View style={styles.row} testID={`learn-vocab-${item.id}`}>
              <View style={{ flex: 1 }}>
                <Text style={styles.word}>{item.word}</Text>
                <Text style={styles.meaning}>{item.meaning}</Text>
              </View>
              <View style={styles.rightCol}>
                {item.seen ? (
                  <View
                    style={[
                      styles.pill,
                      {
                        backgroundColor:
                          item.last_result === "wrong"
                            ? "#F87171"
                            : item.streak >= 3
                            ? learnColors.green
                            : learnColors.surfaceHigh,
                      },
                    ]}
                  >
                    <Text style={styles.pillText}>
                      {item.last_result === "wrong"
                        ? "Missed"
                        : item.streak >= 3
                        ? "Mastered"
                        : "Learning"}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.pill, { backgroundColor: learnColors.surfaceHigh }]}>
                    <Text style={styles.pillText}>New</Text>
                  </View>
                )}
                {item.level ? (
                  <Text style={styles.level}>{item.level}</Text>
                ) : null}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: learnColors.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: "#FFFFFF",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: learnColors.border,
    gap: 12,
  },
  word: { fontFamily: fonts.displayBold, fontSize: 16, color: "#FFFFFF" },
  meaning: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: learnColors.onSurfaceSecondary,
    marginTop: 2,
  },
  rightCol: { alignItems: "flex-end", gap: 4 },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: {
    fontFamily: fonts.textBold,
    fontSize: 10,
    color: "#0B0B0F",
    letterSpacing: 0.4,
  },
  level: {
    fontFamily: fonts.textSemi,
    fontSize: 10,
    color: learnColors.onSurfaceTertiary,
    textTransform: "uppercase",
  },
});
