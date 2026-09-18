import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

// Classic Expo Go ships without the native FCM/APNs push code (Expo removed
// remote-push support from Expo Go starting SDK 53). Merely *importing*
// "expo-notifications" there can throw at module-evaluation time, so we only
// ever require() it lazily, and only when we know push can actually work —
// i.e. not on web, and not inside classic Expo Go. On a real dev-client or
// standalone build this is `false`, so everything behaves exactly per spec.
const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

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

// Presentation handler + channel are registered ONCE at app/_layout module scope.
