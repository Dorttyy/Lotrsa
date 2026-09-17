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
import * as Linking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import type { ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import * as NavigationBar from "expo-navigation-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Ionicons, MaterialCommunityIcons } from "@/src/ui/icons";

import { AuthProvider } from "@/src/context/AuthContext";
import { CallProvider } from "@/src/context/CallContext";
import { NetworkProvider, useNetwork } from "@/src/context/NetworkContext";
import { NotificationsProvider } from "@/src/context/NotificationsContext";
import { RoomSessionProvider } from "@/src/context/RoomSessionContext";
import { ThemeProvider, useTheme } from "@/src/context/ThemeContext";
import { GuestRouteBoundary } from "@/src/components/GuestExperience";
import { OfflineBanner } from "@/src/components/OfflineBanner";
import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { bindNetworkTelemetry } from "@/src/utils/api";
import { AppErrorScreen } from "@/src/components/AppErrorScreen";
import { Notifications, pushSupported } from "@/src/utils/push-native";

SplashScreen.preventAutoHideAsync();

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
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
  });
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
      <NotificationsProvider>
        <CallProvider>
          <RoomSessionProvider>
            <StatusBar style={mode === "dark" ? "light" : "dark"} />
            <Stack
              screenLayout={({ children, route }) => (
                <GuestRouteBoundary name={route.name}>{children}</GuestRouteBoundary>
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
    </AuthProvider>
  );
}

export default function RootLayout() {
  const router = useRouter();
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

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Push notification tap handling — native only, and only where push is
  // actually supported (see src/utils/push-native.ts).
  useEffect(() => {
    if (!pushSupported || !Notifications) return;

    const openTarget = (data: Record<string, unknown>) => {
      const url = (data.deeplink || data.action_url) as string | undefined;
      if (!url) return;
      if (url.startsWith("http")) Linking.openURL(url);
      else router.push(url as never);
    };

    // Warm tap — user taps the notification while the app is open.
    const tapSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        openTarget(response.notification.request.content.data || {});
      },
    );

    // Cold-start tap — app was killed, user tapped the notification to open it.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      openTarget(response.notification.request.content.data || {});
    });

    return () => {
      tapSub.remove();
    };
  }, [router]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
