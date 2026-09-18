import { Ionicons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { fonts } from "@/src/theme";
import { learnColors } from "@/src/learn/theme";

const PHRASES = [
  { text: "Buenos días", ipa: "/ˈbwe.nos ˈdi.as/", meaning: "Good morning" },
  { text: "¿Cómo estás?", ipa: "/ˈko.mo esˈtas/", meaning: "How are you?" },
  { text: "Encantado de conocerte", ipa: "/en.kanˈta.ðo de ko.noˈɾcer.te/", meaning: "Nice to meet you" },
  { text: "Mucho gusto", ipa: "/ˈmu.tʃo ˈɡus.to/", meaning: "Pleasure" },
  { text: "Gracias por todo", ipa: "/ˈɡɾa.sjas por ˈto.ðo/", meaning: "Thanks for everything" },
];

export default function LearnPronunciation() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [feedback, setFeedback] = useState<"good" | "okay" | "retry" | null>(null);
  const phrase = PHRASES[idx];

  const record = () => {
    setFeedback(null);
    setRecording(true);
    setTimeout(() => {
      setRecording(false);
      const opts: ("good" | "okay" | "retry")[] = ["good", "okay", "retry", "good"];
      setFeedback(opts[Math.floor(Math.random() * opts.length)]);
    }, 1800);
  };
  const next = () => {
    setFeedback(null);
    setIdx((i) => (i + 1) % PHRASES.length);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          testID="pron-back"
          onPress={() => router.back()}
          style={styles.iconChip}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color="#FFF" />
        </Pressable>
        <Text style={styles.h1}>Pronunciation</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.instruction}>Tap and hold the microphone to record. We&apos;ll grade your pronunciation.</Text>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.counter}>{idx + 1} / {PHRASES.length}</Text>
            <Pressable style={styles.playBtn} testID="pron-listen">
              <Ionicons name="volume-high" size={16} color="#FFF" />
            </Pressable>
          </View>
          <Text style={styles.phrase}>{phrase.text}</Text>
          <Text style={styles.ipa}>{phrase.ipa}</Text>
          <Text style={styles.meaning}>{phrase.meaning}</Text>

          <Pressable
            testID="pron-record"
            onPress={record}
            style={[styles.record, recording && styles.recording]}
          >
            <Ionicons
              name={recording ? "mic" : "mic-outline"}
              size={30}
              color="#FFF"
            />
          </Pressable>
          <Text style={styles.recordHint}>
            {recording ? "Listening…" : "Tap to record"}
          </Text>

          {feedback && (
            <View
              style={[
                styles.feedback,
                feedback === "good" && { backgroundColor: learnColors.green },
                feedback === "okay" && { backgroundColor: learnColors.yellow },
                feedback === "retry" && { backgroundColor: "#F87171" },
              ]}
            >
              <Text style={styles.feedbackText}>
                {feedback === "good"
                  ? "¡Perfecto! Excellent pronunciation."
                  : feedback === "okay"
                    ? "Close! Try softening the ‘r’ sound."
                    : "Let&apos;s try again — focus on the stressed syllable."}
              </Text>
            </View>
          )}
        </View>

        <Pressable
          testID="pron-next"
          onPress={next}
          style={styles.nextBtn}
        >
          <Text style={styles.nextText}>Next phrase</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFF" />
        </Pressable>
      </ScrollView>
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
  instruction: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: learnColors.onSurfaceSecondary,
    lineHeight: 19,
  },
  card: {
    backgroundColor: learnColors.surface,
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    gap: 10,
  },
  headerRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  counter: {
    fontFamily: fonts.textBold,
    fontSize: 12,
    color: learnColors.onSurfaceSecondary,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: learnColors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  phrase: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: "#FFF",
    textAlign: "center",
    marginTop: 4,
  },
  ipa: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: learnColors.orange,
  },
  meaning: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: learnColors.onSurfaceSecondary,
  },
  record: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: learnColors.orange,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  recording: {
    backgroundColor: "#F87171",
  },
  recordHint: {
    fontFamily: fonts.textBold,
    fontSize: 12,
    color: learnColors.onSurfaceSecondary,
    marginTop: 4,
  },
  feedback: {
    marginTop: 10,
    borderRadius: 16,
    padding: 14,
    width: "100%",
  },
  feedbackText: {
    fontFamily: fonts.textBold,
    fontSize: 13,
    color: "#0B0B0F",
    textAlign: "center",
  },
  nextBtn: {
    backgroundColor: learnColors.surfaceRaised,
    borderRadius: 999,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nextText: { fontFamily: fonts.textBold, fontSize: 14, color: "#FFF" },
});
