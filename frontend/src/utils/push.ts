import { Alert, Linking, Platform } from "react-native";

import { api } from "@/src/utils/api";
import { Notifications, pushSupported } from "@/src/utils/push-native";

export type PushPermissionStatus =
  | "granted"
  | "denied"
  | "undetermined"
  | "unsupported";

/** Current permission status without prompting. Always "unsupported" on web
 * or inside classic Expo Go (see src/utils/push-native.ts). */
export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  if (!pushSupported || !Notifications) return "unsupported";
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function sendTokenToBackend(): Promise<void> {
  if (!Notifications) return;
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("default", {
    name: "Messages, calls and activity", importance: Notifications.AndroidImportance.MAX,
    sound: "default", vibrationPattern: [0, 200, 150, 200],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
  const tokenResp = await Notifications.getDevicePushTokenAsync();
  await api.post("/register-push", {
    user_id: "", // backend always overrides this with the authenticated user
    platform: Platform.OS,
    device_token: tokenResp.data,
  });
}

/**
 * Registers this device for push notifications.
 * - If permission was already granted, silently (re-)registers the token —
 *   safe to call on every app open, since tokens can rotate.
 * - If permission has never been asked, shows a short benefit-first
 *   explanation before triggering the native OS prompt (contextual ask).
 * - If permission was permanently denied, does nothing here — the user can
 *   re-enable it from Profile → Settings → Notifications, which opens the
 *   OS settings screen.
 * No-ops entirely on web or inside classic Expo Go.
 */
export async function registerForPush(): Promise<void> {
  if (!pushSupported || !Notifications) return;
  try {
    const { status: existing, canAskAgain } =
      await Notifications.getPermissionsAsync();

    if (existing === "granted") {
      await sendTokenToBackend();
      return;
    }

    if (existing === "denied" && !canAskAgain) {
      // Permanently blocked — don't nag; user can re-enable via Settings.
      return;
    }

    if (existing === "undetermined") {
      // Contextual, benefit-first explanation before the native popup.
      const proceed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          "Stay in the loop",
          "Get notified about new messages, followers and moment activity.",
          [
            { text: "Not now", style: "cancel", onPress: () => resolve(false) },
            { text: "Enable", onPress: () => resolve(true) },
          ],
        );
      });
      if (!proceed) return;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    if (status === "granted") {
      await sendTokenToBackend();
    }
  } catch {
    // Push registration is best-effort — never block app usage on failure.
  }
}

/** Used by the Profile → Settings screen to let a blocked user recover. */
export async function requestPushPermissionFromSettings(): Promise<PushPermissionStatus> {
  if (!pushSupported || !Notifications) return "unsupported";
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status === "granted") { await sendTokenToBackend(); return status; }
  if (!canAskAgain) {
    Alert.alert(
      "Notifications disabled",
      "Enable notifications for this app in your device Settings to get message and activity alerts.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ],
    );
    return status;
  }
  const req = await Notifications.requestPermissionsAsync();
  if (req.status === "granted") {
    try {
      await sendTokenToBackend();
    } catch {
      // best-effort
    }
  }
  return req.status;
}
