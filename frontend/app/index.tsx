import { Redirect } from "expo-router";
import React from "react";

import { useAuth } from "@/src/context/AuthContext";
import { BrandSplash } from "@/src/components/BrandSplash";
import { useTheme } from "@/src/context/ThemeContext";

/**
 * App entry point.
 *
 * Routes straight into the app: authenticated users land on the main tabs
 * (or onboarding if their languages aren't set yet), everyone else sees the
 * welcome / auth screen.
 */
export default function Index() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) return <BrandSplash testID="app-loading" backgroundColor={colors.surface} />;

  if (!user) return <Redirect href="/welcome" />;

  if (!user.native_language || !user.learning_language) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/connect" />;
}

