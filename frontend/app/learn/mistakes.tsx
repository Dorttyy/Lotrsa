import { Ionicons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { fonts } from "@/src/theme";
import { api } from "@/src/utils/api";
import { learnColors } from "@/src/learn/theme";

interface Mistake {
  id: string;
  vocab_id: string;
  word?: string | null;
  meaning?: string | null;
  level?: string | null;
}

export default function LearnMistakes() {
  const router = useRouter();
  const [items, setItems] = useState<Mistake[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await api.get<Mistake[]>("/learn/mistakes");
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
        <Text style={styles.title}>Recent Mistakes</Text>
        <View style={{ width: 30 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={learnColors.yellow} style={{ marginTop: 20 }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🌟</Text>
          <Text style={styles.emptyTitle}>No mistakes yet</Text>
          <Text style={styles.emptySub}>
            Words you get wrong in a review session will show up here so you
            can drill them.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.vocab_id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View style={styles.row} testID={`learn-mistake-${item.vocab_id}`}>
              <View style={styles.iconBox}>
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.word}>{item.word}</Text>
                <Text style={styles.meaning}>{item.meaning}</Text>
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
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: learnColors.border,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F87171",
    alignItems: "center",
    justifyContent: "center",
  },
  word: { fontFamily: fonts.displayBold, fontSize: 15, color: "#FFFFFF" },
  meaning: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: learnColors.onSurfaceSecondary,
    marginTop: 2,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 6,
  },
  emptyEmoji: { fontSize: 54 },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: "#FFFFFF",
    marginTop: 4,
  },
  emptySub: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: learnColors.onSurfaceSecondary,
    textAlign: "center",
    lineHeight: 19,
  },
});
