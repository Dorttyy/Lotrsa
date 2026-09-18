import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/src/context/AuthContext";

/**
 * App entry point.
 *
 * Routes straight into the app: authenticated users land on the main tabs
 * (or onboarding if their languages aren't set yet), everyone else sees the
 * welcome / auth screen.
 */
export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading} testID="app-loading">
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  if (!user) return <Redirect href="/welcome" />;

  if (!user.native_language || !user.learning_language) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/connect" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
});
