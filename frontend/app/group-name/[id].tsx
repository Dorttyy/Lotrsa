import { Ionicons } from "@/src/ui/icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { api, Conversation } from "@/src/utils/api";

/** Group Name editor — input with clear × and purple OK (reference design). */
export default function GroupName() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<Conversation>(`/chats/${id}`)
      .then((c) => setName(c.name || ""))
      .catch(() => {});
  }, [id]);

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await api.post(`/chats/${id}/group/name`, { name: name.trim() });
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not rename.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Group Name", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="group-name-screen">
      <View style={styles.header}>
        <Pressable testID="gn-back" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Group Name</Text>
        <Pressable
          testID="gn-ok"
          style={[styles.okBtn, (!name.trim() || saving) && { opacity: 0.5 }]}
          disabled={!name.trim() || saving}
          onPress={save}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.okText}>OK</Text>
          )}
        </Pressable>
      </View>
      <View style={styles.inputWrap}>
        <TextInput
          testID="gn-input"
          style={styles.input}
          value={name}
          onChangeText={setName}
          maxLength={80}
          autoFocus
        />
        {name.length > 0 && (
          <Pressable testID="gn-clear" onPress={() => setName("")} hitSlop={8}>
            <Ionicons name="close" size={20} color={colors.onSurfaceSecondary} />
          </Pressable>
        )}
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
    okBtn: {
      width: 48,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#0E9AE0",
      alignItems: "center",
      justifyContent: "center",
    },
    okText: { fontFamily: fonts.textBold, fontSize: 14.5, color: "#FFFFFF" },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.surfaceTertiary,
      borderRadius: radius.md,
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
      paddingHorizontal: 14,
      height: 54,
    },
    input: {
      flex: 1,
      fontFamily: fonts.textSemi,
      fontSize: 16,
      color: colors.onSurface,
    },
  });
