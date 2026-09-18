import { Ionicons } from "@/src/ui/icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts } from "@/src/theme";
import { useTabContentHeight } from "@/src/hooks/use-screen-space";
import { premiumColors } from "@/src/premium/theme";

export default function PremiumTabsLayout() {
  const insets = useSafeAreaInsets();
  const tabContentHeight = useTabContentHeight();
  const bottomGap = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: premiumColors.gold,
        tabBarInactiveTintColor: premiumColors.onSurfaceTertiary,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          lineHeight: 16,
          minHeight: 16,
          flexShrink: 0,
          fontFamily: fonts.textBold,
          fontSize: 11,
        },
        tabBarItemStyle: {
          paddingTop: 2,
          paddingBottom: 2,
        },
        tabBarIconStyle: { height: 32 },
        tabBarLabelPosition: "below-icon",
        tabBarStyle: {
          backgroundColor: premiumColors.surface,
          borderTopColor: premiumColors.divider,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabContentHeight + bottomGap,
          paddingBottom: bottomGap,
          paddingTop: 4,
          ...Platform.select({
            ios: {
              shadowColor: premiumColors.gold,
              shadowOpacity: 0.14,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: -4 },
            },
            android: { elevation: 14 },
            default: {},
          }),
        },
      }}
    >
      <Tabs.Screen
        name="chats"
        options={{
          title: "Chats",
          tabBarButtonTestID: "premium-tab-chats",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="connect"
        options={{
          title: "Connect",
          tabBarButtonTestID: "premium-tab-connect",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="moments"
        options={{
          title: "Moments",
          tabBarButtonTestID: "premium-tab-moments",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="planet" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="voice"
        options={{
          title: "Voice",
          tabBarButtonTestID: "premium-tab-voice",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mic" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Me",
          tabBarButtonTestID: "premium-tab-profile",
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="person" size={size} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
