import Constants from "expo-constants";
import { Platform } from "react-native";

// Classic Expo Go ships without the native FCM/APNs push code (Expo removed
// remote-push support from Expo Go starting SDK 53). Merely *importing*
// "expo-notifications" there can throw at module-evaluation time, so we only
// ever require() it lazily, and only when we know push can actually work —
// i.e. not on web, and not inside classic Expo Go. On a real dev-client or
// standalone build this is `false`, so everything behaves exactly per spec.
const IS_EXPO_GO = Constants.appOwnership === "expo";

export const pushSupported = Platform.OS !== "web" && !IS_EXPO_GO;

let notificationsModule: typeof import("expo-notifications") | null = null;
if (pushSupported) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsModule = require("expo-notifications");
  } catch {
    notificationsModule = null;
  }
}

/** `null` on web, in classic Expo Go, or if the native module failed to load. */
export const Notifications = notificationsModule;

// Register at module scope: foreground delivery can happen before a screen
// mounts. Native system banners handle background/terminated app delivery.
if (pushSupported && notificationsModule) {
  notificationsModule.setNotificationHandler({ handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }) });
  if (Platform.OS === "android") {
    void notificationsModule.setNotificationChannelAsync("default", {
      name: "Messages, calls and activity",
      importance: notificationsModule.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 200, 150, 200],
      lockscreenVisibility: notificationsModule.AndroidNotificationVisibility.PRIVATE,
    }).catch(() => {});
  }
}
