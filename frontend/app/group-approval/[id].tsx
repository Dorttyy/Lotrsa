import { Ionicons } from "@/src/ui/icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
    Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppSwitch } from "@/src/components/AppSwitch";

import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { api, Conversation } from "@/src/utils/api";

/** Approval Settings — Require Approval toggle (owner only, persisted). */
export default function GroupApproval() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [require_, setRequire] = useState(false);

  useEffect(() => {
    api
      .get<Conversation & { require_approval?: boolean }>(`/chats/${id}`)
      .then((c) => setRequire(!!c.require_approval))
      .catch(() => {});
  }, [id]);

  const toggle = async (v: boolean) => {
    setRequire(v);
    try {
      await api.post(`/chats/${id}/group/approval`, { require: v });
    } catch (e) {
      setRequire(!v);
      const msg = e instanceof Error ? e.message : "Could not update.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Approval Settings", msg);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="group-approval-screen">
      <View style={styles.header}>
        <Pressable testID="ga-back" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Approval Settings</Text>
        <View style={{ width: 26 }} />
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Require Approval</Text>
        <AppSwitch
          testID="ga-toggle"
          value={require_}
          onValueChange={toggle}
          trackColor={{ true: "#0E9AE0", false: colors.borderStrong }}
          thumbColor="#FFFFFF"
        />
      </View>
      <Text style={styles.desc}>
        Members must get approval from the group administrator before they can
        join
      </Text>
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
    card: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: 15,
    },
    label: { fontFamily: fonts.textBold, fontSize: 16, color: colors.onSurface },
    desc: {
      fontFamily: fonts.text,
      fontSize: 13.5,
      color: colors.onSurfaceSecondary,
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
      lineHeight: 19,
    },
  });
