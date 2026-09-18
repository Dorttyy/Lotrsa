import { Ionicons } from "@/src/ui/icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { GroupAvatar } from "@/src/components/GroupAvatar";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { api, Conversation } from "@/src/utils/api";

/** Group QR Code — collage + name + QR + Share URL + Save Image. */
export default function GroupQr() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [conv, setConv] = useState<Conversation | null>(null);

  useEffect(() => {
    api.get<Conversation>(`/chats/${id}`).then(setConv).catch(() => {});
  }, [id]);

  const link = `linguaconnect:group:${id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(link)}`;

  const share = async () => {
    try {
      await Share.share({ message: link });
    } catch {
      /* dismissed */
    }
  };
  const saveImage = async () => {
    try {
      await Share.share({ message: qrUrl });
    } catch {
      /* dismissed */
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="group-qr-screen">
      <View style={styles.header}>
        <Pressable testID="gq-back" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Group QR Code</Text>
        <View style={{ width: 26 }} />
      </View>
      <View style={styles.body}>
        <GroupAvatar members={conv?.members_preview || []} size={74} />
        <Text style={styles.name} numberOfLines={1}>
          {conv?.name || "Group Chat"}
        </Text>
        <View style={styles.qrBox}>
          <Image source={{ uri: qrUrl }} style={styles.qr} contentFit="contain" />
        </View>
        <Text style={styles.hint}>Scan the QR code to join the group chat</Text>
        <View style={{ flex: 1 }} />
        <Pressable testID="gq-share" style={styles.shareBtn} onPress={share}>
          <Ionicons name="link" size={18} color={colors.onSurface} />
          <Text style={styles.shareText}>Share URL</Text>
        </Pressable>
        <Pressable testID="gq-save" style={styles.saveBtn} onPress={saveImage}>
          <Ionicons name="download-outline" size={18} color="#FFFFFF" />
          <Text style={styles.saveText}>Save Image</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceSecondary },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    title: {
      flex: 1,
      textAlign: "center",
      fontFamily: fonts.displayBold,
      fontSize: 24,
      color: colors.onSurface,
    },
    body: {
      flex: 1,
      alignItems: "center",
      paddingTop: spacing.xl * 1.5,
      paddingBottom: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    name: {
      fontFamily: fonts.displayBold,
      fontSize: 18,
      color: colors.onSurface,
      marginTop: spacing.md,
      marginBottom: spacing.lg,
    },
    qrBox: {
      backgroundColor: "#FFFFFF",
      borderRadius: radius.md,
      padding: 12,
    },
    qr: { width: 230, height: 230 },
    hint: {
      fontFamily: fonts.text,
      fontSize: 13.5,
      color: colors.onSurfaceSecondary,
      marginTop: spacing.lg,
    },
    shareBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      alignSelf: "stretch",
      backgroundColor: colors.surfaceTertiary,
      borderRadius: radius.pill,
      paddingVertical: 15,
      marginBottom: spacing.md,
    },
    shareText: { fontFamily: fonts.textBold, fontSize: 15.5, color: colors.onSurface },
    saveBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      alignSelf: "stretch",
      backgroundColor: "#0E9AE0",
      borderRadius: radius.pill,
      paddingVertical: 15,
    },
    saveText: { fontFamily: fonts.textBold, fontSize: 15.5, color: "#FFFFFF" },
  });
