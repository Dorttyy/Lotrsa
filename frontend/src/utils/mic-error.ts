import { Alert, Linking, Platform } from "react-native";

import { micErrorMessage } from "@/src/utils/webrtc";

const isDenied = (err: any) =>
  err?.name === "NotAllowedError" || err?.name === "SecurityError";

/**
 * Surfaces a microphone failure in plain language. When the user has blocked
 * the permission we always offer a direct route into the OS settings instead of
 * dead-ending them (Android/iOS); on web we just explain what to do.
 */
export function alertMicError(err: any, title = "Microphone needed") {
  const message = micErrorMessage(err);
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  if (!isDenied(err)) {
    Alert.alert(title, message);
    return;
  }
  Alert.alert(title, message, [
    { text: "Not now", style: "cancel" },
    { text: "Open Settings", onPress: () => Linking.openSettings() },
  ]);
}
