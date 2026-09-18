import { Ionicons } from "@/src/ui/icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/src/components/Avatar";
import { VipBadge } from "@/src/components/Badges";
import { countryToCode } from "@/src/constants/countries";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { AppTitle } from "@/src/ui/AppTitle";
import { api, Conversation, User } from "@/src/utils/api";

const notify = (title: string, message: string) => {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
};

/** "Choose" — pick partners with checkboxes and create a group chat.
 *  With ?add_to={cid} it instead ADDS the selection to an existing group. */
export default function CreateGroup() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams<{ add_to?: string }>();
  const [partners, setPartners] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .get<User[]>("/users/partners")
      .then(setPartners)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = partners.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (p.name || "").toLowerCase().includes(q) ||
      (p.native_language || "").toLowerCase() === q ||
      (p.learning_language || "").toLowerCase() === q
    );
  });

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const create = async () => {
    if (selected.size === 0 || creating) return;
    setCreating(true);
    try {
      if (params.add_to) {
        await api.post(`/chats/${params.add_to}/group/add`, {
          member_ids: Array.from(selected),
        });
        router.back();
      } else {
        const conv = await api.post<Conversation>("/chats/group", {
          member_ids: Array.from(selected),
        });
        router.replace(`/chat/${conv.id}`);
      }
    } catch (e) {
      notify("Group", e instanceof Error ? e.message : "Could not create the group.");
    } finally {
      setCreating(false);
    }
  };

  const canCreate = selected.size > 0 && !creating;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="create-group-screen">
      <View style={styles.header}>
        <Pressable testID="choose-back" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <AppTitle variant="navigation" testID="create-group-header-title" style={styles.title}>Choose</AppTitle>
        <Pressable
          testID="choose-create-btn"
          style={[styles.createBtn, canCreate && styles.createBtnActive]}
          disabled={!canCreate}
          onPress={create}
        >
          {creating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={[styles.createText, canCreate && styles.createTextActive]}>
              {params.add_to ? "Add" : "Create"}
            </Text>
          )}
        </Pressable>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={colors.onSurfaceSecondary} />
        <TextInput
          testID="choose-search"
          style={styles.searchInput}
          placeholder="User name or language (e.g. en)"
          placeholderTextColor={colors.onSurfaceSecondary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={<Text style={styles.section}>Recommend</Text>}
          renderItem={({ item }) => {
            const on = selected.has(item.id);
            return (
              <Pressable
                testID={`choose-row-${item.id}`}
                style={styles.row}
                onPress={() => toggle(item.id)}
              >
                <View style={[styles.checkbox, on && styles.checkboxOn]}>
                  {on && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                </View>
                <Avatar
                  name={item.name}
                  url={item.avatar_url}
                  size={48}
                  flagCode={countryToCode(item.country)}
                />
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.is_vip ? <VipBadge small tier={item.vip_tier} /> : null}
                  </View>
                  <View style={styles.langRow}>
                    <Text style={styles.langCode}>
                      {(item.native_language || "??").toUpperCase()}
                    </Text>
                    <Ionicons
                      name="swap-horizontal"
                      size={12}
                      color={colors.onSurfaceSecondary}
                    />
                    <Text style={styles.langCode}>
                      {(
                        item.learning_languages?.[0] ||
                        item.learning_language ||
                        "??"
                      ).toUpperCase()}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
            <Text style={styles.empty}>No partners match your search.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.surface,
    },
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
    createBtn: {
      minWidth: 74,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surfaceTertiary,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 14,
    },
    createBtnActive: {
      backgroundColor: "#0E9AE0",
    },
    createText: {
      fontFamily: fonts.textBold,
      fontSize: 14.5,
      color: colors.onSurfaceSecondary,
    },
    createTextActive: {
      color: "#FFFFFF",
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      height: 42,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontFamily: fonts.text,
      fontSize: 14.5,
      color: colors.onSurface,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    list: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
    },
    section: {
      fontFamily: fonts.textSemi,
      fontSize: 14.5,
      color: colors.onSurface,
      paddingVertical: spacing.sm,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: 12,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxOn: {
      backgroundColor: "#0E9AE0",
      borderColor: "#0E9AE0",
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    name: {
      fontFamily: fonts.textBold,
      fontSize: 16,
      color: colors.onSurface,
    },
    langRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginTop: 3,
    },
    langCode: {
      fontFamily: fonts.textBold,
      fontSize: 11.5,
      color: colors.onSurfaceTertiary,
    },
    sep: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: 82,
    },
    empty: {
      textAlign: "center",
      fontFamily: fonts.text,
      fontSize: 14,
      color: colors.onSurfaceSecondary,
      marginTop: 40,
    },
  });
