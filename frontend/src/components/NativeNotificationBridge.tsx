import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { Notifications, pushSupported } from "@/src/utils/push-native";
import { notificationTarget } from "@/src/utils/notification-target";
import { sendTokenToBackend } from "@/src/utils/push";

export function NativeNotificationBridge() {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    const notifications = Notifications;
    if (!pushSupported || !notifications || !userId) return;
    let live = true;
    const open = (response: any) => {
      if (!live || !response?.notification) return;
      const request = response.notification.request;
      const key = `${request.identifier}:${response.actionIdentifier}`;
      if (key === handled.current) return;
      handled.current = key;
      router.push(notificationTarget(request.content.data || {}) as any);
      void notifications.clearLastNotificationResponseAsync().catch(() => {});
    };
    const subscription = notifications.addNotificationResponseReceivedListener(open);
    const refreshed = notifications.addPushTokenListener(() => {
      if (live) void notifications.getPermissionsAsync().then(permission => {
        if (live && permission.granted) return sendTokenToBackend();
      }).catch(() => {});
    });
    const appState = AppState.addEventListener("change", state => {
      if (state === "active") void notifications.getPermissionsAsync().then(permission => {
        if (live && permission.granted) return sendTokenToBackend();
      }).catch(() => {});
    });
    void notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    return () => { live = false; subscription.remove(); refreshed.remove(); appState.remove(); };
  }, [userId, router]);
  return null;
}