import {
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
} from "@expo-google-fonts/figtree";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from "@expo-google-fonts/nunito";
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_800ExtraBold,
} from "@expo-google-fonts/playfair-display";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import type { ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import * as NavigationBar from "expo-navigation-bar";
import { useCallback, useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Ionicons, MaterialCommunityIcons } from "@/src/ui/icons";

import { AuthProvider } from "@/src/context/AuthContext";
import { initializeRevenueCat, SubscriptionProvider } from "@/src/billing/revenuecat";
import { NativeNotificationBridge } from "@/src/components/NativeNotificationBridge";
import { CallProvider } from "@/src/context/CallContext";
import { NetworkProvider, useNetwork } from "@/src/context/NetworkContext";
import { NotificationsProvider } from "@/src/context/NotificationsContext";
import { RoomSessionProvider } from "@/src/context/RoomSessionContext";
import { ThemeProvider, useTheme } from "@/src/context/ThemeContext";
import { AuthRouteBoundary } from "@/src/components/AuthRouteBoundary";
import { OfflineBanner } from "@/src/components/OfflineBanner";
import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { bindNetworkTelemetry } from "@/src/utils/api";
import { AppErrorScreen } from "@/src/components/AppErrorScreen";
import { Notifications, pushSupported } from "@/src/utils/push-native";
import { BrandSplash } from "@/src/components/BrandSplash";

void SplashScreen.preventAutoHideAsync().catch(() => {});
initializeRevenueCat();

// Router-level crash screen — generic, no technical details or builder branding.
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <AppErrorScreen onRetry={retry} />;
}

// Slightly bolder icons app-wide (subtle faux-bold; icons that pass their own
// style keep their exact look — e.g. custom-styled glyphs).
const boldIconStyle = { fontWeight: "600" as const };
(Ionicons as any).defaultProps = {
  ...(Ionicons as any).defaultProps,
  style: boldIconStyle,
};
(MaterialCommunityIcons as any).defaultProps = {
  ...(MaterialCommunityIcons as any).defaultProps,
  style: boldIconStyle,
};

// 1. Foreground handler — MODULE SCOPE, before any component mounts.
if (pushSupported && Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// 2. Android notification channel — MODULE SCOPE, must exist before any
// push can arrive (created lazily inside a flow would be too late).
if (pushSupported && Notifications && Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("default", {
    name: "Messages, calls and activity",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
    vibrationPattern: [0, 200, 150, 200],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  }).catch(() => {});
}

function ThemedApp() {
  const { mode, colors } = useTheme();
  const { reportFailure, reportSuccess } = useNetwork();
  // Bridge the api.ts telemetry hooks into React state exactly once.
  useEffect(() => {
    bindNetworkTelemetry(reportFailure, reportSuccess);
  }, [reportFailure, reportSuccess]);
  // Keep the OS chrome in lock-step with the app theme: the root/system
  // background (visible behind the status bar, during transitions and at the
  // edges on notched devices) always matches the app surface colour, and the
  // Android gesture/nav-bar buttons stay legible in both modes.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.surface).catch(() => {});
    if (Platform.OS === "android") {
      // expo-navigation-bar SDK 57 replaced setButtonStyleAsync with setStyle
      // (synchronous). "dark" = dark bar w/ light buttons, "light" = vice-versa.
      NavigationBar.setStyle?.(mode === "dark" ? "dark" : "light");
    }
  }, [mode, colors.surface]);
  return (
    <AuthProvider>
      <SubscriptionProvider>
      <NotificationsProvider>
        <CallProvider>
            <NativeNotificationBridge />
          <RoomSessionProvider>
            <StatusBar style={mode === "dark" ? "light" : "dark"} />
            <Stack
              screenLayout={({ children, route }) => (
                <AuthRouteBoundary name={route.name}>{children}</AuthRouteBoundary>
              )}
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.surface },
              }}
            />
            <OfflineBanner />
          </RoomSessionProvider>
        </CallProvider>
      </NotificationsProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default function RootLayout() {
  const [iconsLoaded, iconsError] = useIconFonts();
  const [fontsLoaded, fontsError] = useFonts({
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const ready = (iconsLoaded || !!iconsError) && (fontsLoaded || !!fontsError);

  const onRootLayout = useCallback(() => {
    // Hide native artwork only after the replacement UI has laid out.
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // NativeNotificationBridge is the SINGLE warm/cold tap owner. It waits for
  // authenticated state and deduplicates the response before opening a route.

  if (!ready) return <BrandSplash />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onRootLayout}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <ThemeProvider>
            <NetworkProvider>
              <ThemedApp />
            </NetworkProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
