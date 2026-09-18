import { Ionicons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { fonts } from "@/src/theme";
import { learnColors } from "@/src/learn/theme";

const PROMPTS = [
  {
    id: "morning",
    color: learnColors.yellow,
    emoji: "☀️",
    title: "Describe your morning",
    body: "In 3-5 Spanish sentences, describe what you did this morning. Try to use the preterite past.",
    minWords: 20,
  },
  {
    id: "dream",
    color: "#DABFFF",
    emoji: "🌟",
    title: "A dream destination",
    body: "Write about a place you'd love to visit and why. Use the conditional ('me gustaría').",
    minWords: 25,
  },
  {
    id: "opinion",
    color: learnColors.green,
    emoji: "💬",
    title: "State an opinion",
    body: "Pick a small topic (coffee vs. tea, cats vs. dogs) and defend it in Spanish.",
    minWords: 30,
  },
];

export default function LearnWriting() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [checked, setChecked] = useState<{ score: number; note: string } | null>(null);
  const prompt = PROMPTS[idx];
  const words = text.trim().split(/\s+/).filter(Boolean).length;

  const check = () => {
    // Mocked "feedback". A real product would call an LLM.
    const score = Math.min(100, Math.round((words / prompt.minWords) * 90) + 5);
    const notes = [
      "Solid effort. Try more connectors like 'porque' and 'además'.",
      "Great vocab range! Watch for verb agreement in the past tense.",
      "Clear structure. Adding one more sentence with an adverb would help.",
    ];
    setChecked({ score, note: notes[Math.floor(Math.random() * notes.length)] });
  };
  const nextPrompt = () => {
    setIdx((i) => (i + 1) % PROMPTS.length);
    setText("");
    setChecked(null);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          testID="writing-back"
          onPress={() => router.back()}
          style={styles.iconChip}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color="#FFF" />
        </Pressable>
        <Text style={styles.h1}>Writing Practice</Text>
        <Pressable
          testID="writing-next"
          onPress={nextPrompt}
          style={styles.iconChip}
          hitSlop={8}
        >
          <Ionicons name="shuffle" size={18} color="#FFF" />
        </Pressable>
      </View>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.promptCard, { backgroundColor: prompt.color }]}>
          <Text style={styles.promptEmoji}>{prompt.emoji}</Text>
          <Text style={styles.promptTitle}>{prompt.title}</Text>
          <Text style={styles.promptBody}>{prompt.body}</Text>
          <View style={styles.minPill}>
            <Text style={styles.minText}>min {prompt.minWords} words</Text>
          </View>
        </View>

        <View style={styles.editor}>
          <TextInput
            testID="writing-input"
            multiline
            placeholder="Empieza a escribir aquí…"
            placeholderTextColor={learnColors.onSurfaceTertiary}
            value={text}
            onChangeText={setText}
            style={styles.input}
          />
          <View style={styles.editorFoot}>
            <Text style={styles.words}>{words} words</Text>
            <Pressable
              testID="writing-check"
              onPress={check}
              disabled={words < 5}
              style={[styles.check, words < 5 && { opacity: 0.4 }]}
            >
              <Text style={styles.checkText}>Check</Text>
              <Ionicons name="sparkles" size={14} color="#FFF" />
            </Pressable>
          </View>
        </View>

        {checked && (
          <View style={styles.feedback}>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Score</Text>
              <Text style={styles.score}>{checked.score}</Text>
            </View>
            <Text style={styles.note}>{checked.note}</Text>
          </View>
        )}
      </KeyboardAwareScrollView>
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
    paddingTop: 6,
    paddingBottom: 6,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: learnColors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  h1: { fontFamily: fonts.displayBold, fontSize: 18, color: "#FFF" },
  body: { padding: 20, gap: 14 },
  promptCard: {
    borderRadius: 24,
    padding: 20,
    gap: 6,
  },
  promptEmoji: { fontSize: 40 },
  promptTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: "#0B0B0F",
    marginTop: 4,
  },
  promptBody: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: "#0B0B0F",
    opacity: 0.75,
    lineHeight: 19,
  },
  minPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.14)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },
  minText: { fontFamily: fonts.textBold, fontSize: 11, color: "#0B0B0F" },
  editor: {
    backgroundColor: learnColors.surface,
    borderRadius: 22,
    padding: 16,
    gap: 12,
  },
  input: {
    fontFamily: fonts.textSemi,
    fontSize: 15,
    color: "#FFF",
    minHeight: 140,
    textAlignVertical: "top",
    lineHeight: 22,
  },
  editorFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  words: {
    fontFamily: fonts.textBold,
    fontSize: 12,
    color: learnColors.onSurfaceSecondary,
  },
  check: {
    backgroundColor: learnColors.orange,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  checkText: { fontFamily: fonts.textBold, fontSize: 13, color: "#FFF" },
  feedback: {
    backgroundColor: learnColors.surface,
    borderRadius: 22,
    padding: 18,
    gap: 10,
    borderWidth: 1.5,
    borderColor: learnColors.orange,
  },
  scoreRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  scoreLabel: {
    fontFamily: fonts.textBold,
    fontSize: 12,
    color: learnColors.onSurfaceSecondary,
    letterSpacing: 1,
  },
  score: {
    fontFamily: fonts.displayBold,
    fontSize: 32,
    color: learnColors.orange,
  },
  note: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: "#FFF",
    lineHeight: 19,
  },
});
