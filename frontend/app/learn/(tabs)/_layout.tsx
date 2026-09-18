import { Ionicons } from "@/src/ui/icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLearnTheme } from "@/src/learn/ThemeContext";

type IonIcon = keyof typeof Ionicons.glyphMap;

type TabDef = {
  name: string;
  label: string;
  icon: IonIcon;
};

// Same visual language as the main app tabs: solid Ionicons glyphs, active
// state uses the sub-app's brand purple, inactive falls back to the palette
// secondary text colour — no pill backgrounds, no custom SVGs.
const TABS: TabDef[] = [
  { name: "index", label: "Home", icon: "home" },
  { name: "lessons", label: "Lessons", icon: "play-circle" },
  { name: "vocabulary", label: "Vocabulary", icon: "book" },
  { name: "tutors", label: "Tutors", icon: "happy" },
  { name: "profile", label: "Profile", icon: "person" },
];

export default function VocabTabsLayout() {
  const { colors } = useLearnTheme();
  const insets = useSafeAreaInsets();
  const bottomGap = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.tabActivePill,
        tabBarInactiveTintColor: colors.textDim,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          lineHeight: 16,
          minHeight: 16,
          flexShrink: 0,
          fontSize: 11,
          fontWeight: "700",
        },
        tabBarItemStyle: {
          paddingTop: 2,
          paddingBottom: 2,
        },
        tabBarIconStyle: { height: 32 },
        tabBarLabelPosition: "below-icon",
        tabBarStyle: {
          backgroundColor: colors.tabBg,
          borderTopColor: colors.border,
          borderTopWidth: colors.mode === "light" ? StyleSheet.hairlineWidth : 0,
          height: 64 + bottomGap,
          paddingBottom: bottomGap,
          paddingTop: 4,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOpacity: colors.mode === "light" ? 0.06 : 0.4,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: -3 },
            },
            android: { elevation: 12 },
            default: {},
          }),
        },
      } as any}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.label,
            tabBarButtonTestID: `vocab-tab-${t.name === "index" ? "home" : t.name}`,
            tabBarIcon: ({ color, size }) => (
              <View>
                <Ionicons name={t.icon} size={size} color={color} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
