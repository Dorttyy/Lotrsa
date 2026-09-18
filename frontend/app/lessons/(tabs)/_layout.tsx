import { Ionicons } from "@/src/ui/icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { lessonColors, lessonFonts } from "@/src/lessons/theme";
import { useTabContentHeight } from "@/src/hooks/use-screen-space";

export default function LessonsTabsLayout() {
  const insets = useSafeAreaInsets();
  const tabContentHeight = useTabContentHeight();
  const bottomGap = Math.max(insets.bottom, 10) + 6;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: lessonColors.green,
        tabBarInactiveTintColor: lessonColors.inkFaint,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontFamily: lessonFonts.bold, fontSize: 10.5, marginTop: 2, lineHeight: 16, minHeight: 16, flexShrink: 0 },
        tabBarItemStyle: { paddingTop: 2, paddingBottom: 2 },
        tabBarIconStyle: { height: 32 },
        tabBarLabelPosition: "below-icon",
        tabBarStyle: {
          backgroundColor: lessonColors.surface,
          borderTopColor: lessonColors.border,
          borderTopWidth: 2,
          height: tabContentHeight + bottomGap,
          paddingBottom: bottomGap,
          ...Platform.select({
            ios: { shadowColor: lessonColors.shadow, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 } },
            android: { elevation: 14 },
            default: {},
          }),
        },
      }}
    >
      <Tabs.Screen name="learn" options={{ title: "Learn", tabBarButtonTestID: "lessons-tab-learn", tabBarIcon: ({ color, size, focused }) => (<Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />) }} />
      <Tabs.Screen name="leaderboard" options={{ title: "League", tabBarButtonTestID: "lessons-tab-leaderboard", tabBarIcon: ({ color, size, focused }) => (<Ionicons name={focused ? "shield" : "shield-outline"} size={size} color={color} />) }} />
      <Tabs.Screen name="quests" options={{ title: "Quests", tabBarButtonTestID: "lessons-tab-quests", tabBarIcon: ({ color, size, focused }) => (<Ionicons name={focused ? "flag" : "flag-outline"} size={size} color={color} />) }} />
      <Tabs.Screen name="shop" options={{ title: "Shop", tabBarButtonTestID: "lessons-tab-shop", tabBarIcon: ({ color, size, focused }) => (<Ionicons name={focused ? "cart" : "cart-outline"} size={size} color={color} />) }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarButtonTestID: "lessons-tab-profile", tabBarIcon: ({ color, size, focused }) => (<Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />) }} />
    </Tabs>
  );
}
