import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/context/ThemeContext";
import { fonts } from "@/src/theme";
import { MicGlyph } from "@/src/ui/MicGlyph";
import { UploadedActionIcon } from "@/src/ui/UploadedActionIcon";
import type { ChatMessagePreview } from "@/src/utils/api";

/** Only typed media previews lose their old leading emoji. User text stays intact. */
export function inboxPreview(message: ChatMessagePreview | null) {
  const text = message?.text || "";
  switch (message?.type) {
    case "voice":
      return { icon: "voice", text: text.replace(/^🔊\s*/u, "") || "Voice message" } as const;
    case "call":
      return { icon: "call", text: text.replace(/^📞\s*/u, "") ||
        (message.call_status === "missed" ? "Missed call" : "Call") } as const;
    case "room":
      return { icon: "room", text: text.replace(/^🎙\uFE0F?\s*/u, "") || "Voice room" } as const;
    default:
      return { icon: null, text: text || "Say hello 👋" };
  }
}

export function ChatLastMessage({ message, conversationId }: {
  message: ChatMessagePreview | null;
  conversationId: string;
}) {
  const { colors } = useTheme();
  const preview = inboxPreview(message);
  const iconId = `chat-preview-${preview.icon}-icon-${conversationId}`;
  return (
    <View style={styles.row} testID={`chat-preview-${conversationId}`}>
      {preview.icon === "call" ? (
        <UploadedActionIcon artwork="call" size={16} color={colors.onSurfaceSecondary} testID={iconId} />
      ) : preview.icon ? (
        <MicGlyph size={16} color={colors.onSurfaceSecondary} testID={iconId} />
      ) : null}
      <Text testID={`chat-preview-text-${conversationId}`} numberOfLines={1}
        ellipsizeMode="tail" style={[styles.text, { color: colors.onSurfaceSecondary }]}>
        {preview.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 5 },
  text: { flex: 1, minWidth: 0, fontFamily: fonts.text, fontSize: 14 },
});