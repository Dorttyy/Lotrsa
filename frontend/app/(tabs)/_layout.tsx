import { Redirect, Tabs } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CheckInModal } from "@/src/components/CheckInModal";
import { useAuth } from "@/src/context/AuthContext";
import { useNotifications } from "@/src/context/NotificationsContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts } from "@/src/theme";
import {
  ChatsIcon,
  ConnectIcon,
  MeIcon,
  MomentsIcon,
  VoiceIcon,
} from "@/src/ui/NavIcons";
import { api } from "@/src/utils/api";

interface CheckInReward {
  streak: number;
  coinsAwarded: number;
  totalCoins: number;
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, loading } = useAuth();
  const { chatUnread, momentsUnread, profileUnread } = useNotifications();
  const [reward, setReward] = useState<CheckInReward | null>(null);

  // Daily streak check-in: runs once when the main app mounts. The backend
  // is idempotent per UTC day, so repeat mounts are harmless no-ops.
  useEffect(() => {
    if (!user) return;
    let active = true;
    api
      .post<{
        already_checked_in: boolean;
        coins_awarded: number;
        streak_count: number;
        coins: number;
      }>("/users/me/check-in")
      .then((res) => {
        if (!active || res.already_checked_in || res.coins_awarded <= 0) return;
        setReward({
          streak: res.streak_count,
          coinsAwarded: res.coins_awarded,
          totalCoins: res.coins,
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  // Reserve room for the device's home indicator / nav bar, plus a little
  // extra lift so the icon row sits comfortably clear of the very edge.
  const bottomGap = Math.max(insets.bottom, 12) + 10;

  if (loading) return null;
  if (!user) {
    return <Redirect href="/auth?mode=login" />;
  }

  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.onSurfaceSecondary,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontFamily: fonts.textBold,
          fontSize: 11,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          borderTopWidth: StyleSheet.hairlineWidth,
          // Comfortable content height + safe-area gap (min 12) so the bar
          // stays lifted above the home indicator on every device.
          height: 56 + bottomGap,
          paddingBottom: bottomGap,
          paddingTop: 8,
          ...Platform.select({
            ios: {
              shadowColor: "#0F172A",
              shadowOpacity: 0.06,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: -3 },
            },
            android: { elevation: 12 },
            default: {},
          }),
        },
      }}
    >
      <Tabs.Screen
        name="chats"
        options={{
          title: "Chats",
          tabBarButtonTestID: "tab-chats",
          tabBarBadge:
            chatUnread > 0 ? (chatUnread > 99 ? "99+" : chatUnread) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.error,
            color: "#FFFFFF",
            fontFamily: fonts.textBold,
            fontSize: 10,
          },
          tabBarIcon: ({ focused, color, size }) => (
            <ChatsIcon focused={focused} size={size + 4} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="connect"
        options={{
          title: "Connect",
          tabBarButtonTestID: "tab-connect",
          tabBarIcon: ({ focused, color, size }) => (
            <ConnectIcon focused={focused} size={size + 4} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="moments"
        options={{
          title: "Moments",
          tabBarButtonTestID: "tab-moments",
          tabBarBadge:
            momentsUnread > 0
              ? momentsUnread > 99
                ? "99+"
                : momentsUnread
              : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.error,
            color: "#FFFFFF",
            fontFamily: fonts.textBold,
            fontSize: 10,
          },
          tabBarIcon: ({ focused, color, size }) => (
            <MomentsIcon focused={focused} size={size + 4} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="voice"
        options={{
          title: "Voice",
          tabBarButtonTestID: "tab-voice",
          tabBarIcon: ({ focused, color, size }) => (
            <VoiceIcon focused={focused} size={size + 4} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Me",
          tabBarButtonTestID: "tab-profile",
          tabBarIcon: ({ focused, color, size }) => (
            <View>
              <MeIcon
                focused={focused}
                size={size + 4}
                color={color}
                gender={user?.gender}
              />
              {profileUnread > 0 && (
                <View
                  testID="profile-tab-dot"
                  style={[styles.tabDot, { borderColor: colors.surface }]}
                />
              )}
            </View>
          ),
        }}
      />
    </Tabs>
    <CheckInModal
      visible={!!reward}
      streak={reward?.streak ?? 1}
      coinsAwarded={reward?.coinsAwarded ?? 0}
      totalCoins={reward?.totalCoins ?? 0}
      onClose={() => setReward(null)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  tabDot: {
    position: "absolute",
    top: 0,
    right: 2,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
  },
});
