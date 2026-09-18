import { Ionicons } from "@/src/ui/icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { proColors, proFonts } from "@/src/pro/theme";
import { useTabContentHeight } from "@/src/hooks/use-screen-space";

/**
 * Bottom tab bar mirrors the MAIN app's icon-based navbar layout, but with a
 * different icon set + the warm Pro palette. Tabs: Home, Tutors, Learn,
 * Progress, Profile.
 */
export default function ProTabsLayout() {
  const insets = useSafeAreaInsets();
  const tabContentHeight = useTabContentHeight();
  const bottomGap = Math.max(insets.bottom, 12) + 8;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: proColors.terracotta,
        tabBarInactiveTintColor: proColors.inkFaint,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontFamily: proFonts.sansSemi,
          fontSize: 11,
          lineHeight: 16,
          minHeight: 16,
          flexShrink: 0,
          marginTop: 2,
        },
        tabBarItemStyle: { paddingTop: 2, paddingBottom: 2 },
        tabBarIconStyle: { height: 32 },
        tabBarLabelPosition: "below-icon",
        tabBarStyle: {
          backgroundColor: proColors.surface,
          borderTopColor: proColors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabContentHeight + bottomGap,
          paddingBottom: bottomGap,
          paddingTop: 6,
          ...Platform.select({
            ios: {
              shadowColor: "#3A2E22",
              shadowOpacity: 0.06,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: -4 },
            },
            android: { elevation: 16 },
            default: {},
          }),
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarButtonTestID: "pro-tab-home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="radio-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tutors"
        options={{
          title: "Tutors",
          tabBarButtonTestID: "pro-tab-tutors",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: "Learn",
          tabBarButtonTestID: "pro-tab-learn",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarButtonTestID: "pro-tab-progress",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarButtonTestID: "pro-tab-profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
