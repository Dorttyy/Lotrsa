import { DeviceEventEmitter, NativeModules, Platform } from "react-native";

// Native routing only. Web/Expo Go cannot switch a phone's receiver/speaker;
// never silently pretend a routing command succeeded on those platforms.
let InCall: any = null;
const native = NativeModules.InCallManager;
if (Platform.OS !== "web" && native && typeof native.setForceSpeakerphoneOn === "function") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    InCall = require("react-native-incall-manager").default;
  } catch { InCall = null; }
}
let active = false;
let externalRoute = false;

export const audioSession = {
  available: !!InCall,
  start(speaker: boolean) {
    if (!InCall || active) return;
    try {
      InCall.start({ media: "audio", auto: true });
      active = true;
      // Voice rooms use loudspeaker; private calls default to OS receiver or
      // a connected headset. Explicit button taps change the override later.
      InCall.setForceSpeakerphoneOn(speaker ? true : null);
    } catch { active = false; }
  },
  setSpeaker(on: boolean) {
    if (!InCall) throw new Error("Speaker switching requires the installed mobile app, not Expo Go or a browser.");
    if (!active) {
      audioSession.start(false);
      if (!active) throw new Error("The phone's call audio session could not start.");
    }
    if (externalRoute) throw new Error("Your headset is handling this call. Disconnect it to use the phone speaker.");
    // ONE routing API; no volume/mic workaround or competing setSpeakerphoneOn.
    InCall.setForceSpeakerphoneOn(on);
  },
  onRouteChanged(callback: (route: string) => void) {
    if (!InCall) return () => {};
    const subscription = DeviceEventEmitter.addListener("onAudioDeviceChanged", event => {
      const route = String(event.selectedAudioDevice || "");
      externalRoute = ["BLUETOOTH", "WIRED_HEADSET"].includes(route);
      callback(route);
    });
    return () => subscription.remove();
  },
  stop() {
    if (!InCall || !active) return;
    try {
      InCall.setForceSpeakerphoneOn(null);
      InCall.stop();
    } catch { /* Cleanup must never prevent leaving a call or room. */ }
    finally { active = false; externalRoute = false; }
  },
};