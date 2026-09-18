import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";

/** Public entry screens mount normally; all other screens require a real account. */
export function AuthRouteBoundary({ name, children }: { name: string; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  if (["index", "welcome", "auth"].includes(name)) return <>{children}</>;
  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.brand} accessibilityLabel="Loading your account" />
      </View>
    );
  }
  if (!user) return <Redirect href="/auth?mode=login" />;
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
