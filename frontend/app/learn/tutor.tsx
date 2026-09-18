import { Ionicons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "@/src/components/layout/KeyboardAvoidingView";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { fonts } from "@/src/theme";
import { learnColors } from "@/src/learn/theme";

interface Msg {
  id: string;
  role: "you" | "tutor";
  text: string;
}

const STARTER: Msg[] = [
  {
    id: "1",
    role: "tutor",
    text: "¡Hola! I'm Lupe, your Spanish tutor. Tell me what you did today — in Spanish, however you can. I'll help you polish it.",
  },
];

// Rule-of-thumb replies. In a real product this would hit an LLM endpoint.
const REPLIES = [
  "¡Muy bien! Small tweak: try adding a time marker like 'esta mañana' or 'ayer'. Would you like to try again?",
  "Nice attempt! A more natural way is: 'Fui al parque y caminé un rato'. Notice the preterite.",
  "¡Perfecto! Now let's push harder — describe how you felt using estar + adjective.",
  "Bien dicho. Recuerda: 'gustar' uses indirect objects. E.g., 'Me gusta la música'.",
  "That's great practice! Ready for a mini-quiz on the verbs you just used?",
];

export default function LearnTutor() {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>(STARTER);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    const you: Msg = { id: `${Date.now()}-y`, role: "you", text: t };
    setMsgs((m) => [...m, you]);
    setText("");
    setTyping(true);
    setTimeout(() => {
      const reply = REPLIES[Math.floor(Math.random() * REPLIES.length)];
      setMsgs((m) => [
        ...m,
        { id: `${Date.now()}-t`, role: "tutor", text: reply },
      ]);
      setTyping(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }, 900);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          testID="tutor-back"
          onPress={() => router.back()}
          style={styles.iconChip}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color="#FFF" />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 20 }}>🤖</Text>
          </View>
          <View>
            <Text style={styles.name}>Lupe</Text>
            <Text style={styles.subline}>AI tutor · online</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <FlatList
          ref={listRef}
          data={msgs}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.role === "you" ? styles.you : styles.tutor,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  item.role === "you" && { color: "#FFF" },
                ]}
              >
                {item.text}
              </Text>
            </View>
          )}
          ListFooterComponent={
            typing ? (
              <View style={[styles.bubble, styles.tutor]}>
                <Text style={styles.bubbleText}>Lupe is typing…</Text>
              </View>
            ) : null
          }
        />

        <View style={styles.inputBar}>
          <TextInput
            testID="tutor-input"
            value={text}
            onChangeText={setText}
            placeholder="Type in Spanish…"
            placeholderTextColor={learnColors.onSurfaceTertiary}
            style={styles.input}
            multiline
          />
          <Pressable
            testID="tutor-send"
            onPress={send}
            style={[styles.send, !text.trim() && { opacity: 0.4 }]}
          >
            <Ionicons name="send" size={16} color="#FFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: learnColors.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
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
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: learnColors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontFamily: fonts.displayBold, fontSize: 15, color: "#FFF" },
  subline: {
    fontFamily: fonts.textSemi,
    fontSize: 11,
    color: learnColors.green,
  },
  list: { padding: 16, gap: 8, paddingBottom: 24 },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "82%",
    marginVertical: 4,
  },
  tutor: {
    backgroundColor: learnColors.surface,
    alignSelf: "flex-start",
    borderTopLeftRadius: 4,
  },
  you: {
    backgroundColor: learnColors.orange,
    alignSelf: "flex-end",
    borderTopRightRadius: 4,
  },
  bubbleText: {
    fontFamily: fonts.textSemi,
    fontSize: 14,
    color: "#FFF",
    lineHeight: 20,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    padding: 12,
    backgroundColor: learnColors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: learnColors.border,
  },
  input: {
    flex: 1,
    fontFamily: fonts.textSemi,
    fontSize: 14,
    color: "#FFF",
    backgroundColor: learnColors.surfaceRaised,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 120,
    minHeight: 40,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: learnColors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
});
