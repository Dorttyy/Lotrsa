import { Ionicons, MaterialCommunityIcons } from "@/src/ui/icons";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";

const notify = (title: string, message: string) => {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
};

/** "Add" sheet — search ID · Create Group Chat · Scan QR · Invite · my QR. */
export default function AddSheet() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState("");

  const myId = user?.username ? `@${user.username}` : "@me";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
    `linguaconnect:user:${user?.username || user?.id || ""}`,
  )}`;

  const submitSearch = () => {
    const q = query.trim();
    if (!q) return;
    router.push({ pathname: "/search", params: { q } });
  };

  const invite = async () => {
    try {
      await Share.share({
        message:
          "Join me on Mello — practice languages with native speakers! " +
          `My ID is ${myId}.`,
      });
    } catch {
      /* dismissed */
    }
  };

  const shareQr = async () => {
    try {
      await Share.share({ message: qrUrl });
    } catch {
      /* dismissed */
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="add-sheet">
      <KeyboardAwareScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        bottomOffset={spacing.xl}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable testID="add-close" onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="close" size={26} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>Add</Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color={colors.onSurfaceSecondary} />
          <TextInput
            testID="add-search-input"
            style={styles.searchInput}
            placeholder="Search ID"
            placeholderTextColor={colors.onSurfaceSecondary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submitSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.card}>
          <Pressable
            testID="add-create-group"
            style={styles.row}
            onPress={() => router.push("/create-group")}
          >
            <MaterialCommunityIcons
              name="account-multiple-plus"
              size={22}
              color={colors.onSurface}
            />
            <Text style={styles.rowLabel}>Create Group Chat</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceSecondary} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            testID="add-scan-qr"
            style={styles.row}
            onPress={() => notify("Scan QR Code", "QR scanning is coming soon!")}
          >
            <MaterialCommunityIcons name="qrcode-scan" size={21} color={colors.onSurface} />
            <Text style={styles.rowLabel}>Scan QR Code</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceSecondary} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable testID="add-invite" style={styles.row} onPress={invite}>
            <Ionicons name="mail-outline" size={21} color={colors.onSurface} />
            <Text style={styles.rowLabel}>Invite</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceSecondary} />
          </Pressable>
        </View>

        <View style={styles.qrSection}>
          <Text style={styles.qrTitle}>My ID</Text>
          <Pressable
            style={styles.idRow}
            onPress={async () => {
              await Clipboard.setStringAsync(myId);
              notify("Copied", "Your ID was copied to the clipboard.");
            }}
          >
            <Text style={styles.idText}>{myId}</Text>
            <Ionicons name="copy-outline" size={14} color={colors.onSurfaceSecondary} />
          </Pressable>
          <View style={styles.qrBox}>
            <Image source={{ uri: qrUrl }} style={styles.qrImage} contentFit="contain" />
          </View>
          <Pressable testID="add-share-qr" style={styles.shareBtn} onPress={shareQr}>
            <Ionicons name="share-outline" size={17} color="#FFFFFF" />
            <Text style={styles.shareText}>Share QR Code</Text>
          </Pressable>
          <Pressable onPress={shareQr}>
            <Text style={styles.saveText}>Save as Image</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.surfaceSecondary,
    },
    body: {
      padding: spacing.lg,
      paddingBottom: spacing.xl,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    title: {
      flex: 1,
      textAlign: "center",
      fontFamily: fonts.displayBold,
      fontSize: 24,
      color: colors.onSurface,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.surfaceTertiary,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      height: 44,
      marginBottom: spacing.lg,
    },
    searchInput: {
      flex: 1,
      fontFamily: fonts.text,
      fontSize: 15,
      color: colors.onSurface,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: 17,
    },
    rowLabel: {
      flex: 1,
      fontFamily: fonts.textSemi,
      fontSize: 16,
      color: colors.onSurface,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    qrSection: {
      alignItems: "center",
      marginTop: spacing.xl * 2,
    },
    qrTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 16.5,
      color: colors.onSurface,
    },
    idRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginTop: 4,
      marginBottom: spacing.md,
    },
    idText: {
      fontFamily: fonts.textSemi,
      fontSize: 14,
      color: colors.onSurfaceSecondary,
    },
    qrBox: {
      backgroundColor: "#FFFFFF",
      borderRadius: radius.md,
      padding: 10,
    },
    qrImage: {
      width: 170,
      height: 170,
    },
    shareBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "#0E9AE0",
      borderRadius: radius.pill,
      paddingHorizontal: 26,
      paddingVertical: 13,
      marginTop: spacing.lg,
    },
    shareText: {
      fontFamily: fonts.textBold,
      fontSize: 15,
      color: "#FFFFFF",
    },
    saveText: {
      fontFamily: fonts.textSemi,
      fontSize: 14,
      color: colors.onSurfaceSecondary,
      marginTop: spacing.md,
    },
  });
