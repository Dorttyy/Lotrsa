import { Redirect } from "expo-router";
import React from "react";

import { useAuth } from "@/src/context/AuthContext";
import { BrandSplash } from "@/src/components/BrandSplash";
import { useTheme } from "@/src/context/ThemeContext";

/** Public entry screens mount normally; all other screens require a real account. */
export function AuthRouteBoundary({ name, children }: { name: string; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  if (["index", "welcome", "auth"].includes(name)) return <>{children}</>;
  if (loading) return <BrandSplash testID="session-loading" backgroundColor={colors.surface} />;
  if (!user) return <Redirect href="/auth?mode=login" />;
  return <>{children}</>;
}

