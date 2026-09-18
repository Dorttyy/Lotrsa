# Android / iOS calling and Voiceroom validation

## Evidence boundaries

User asked to verify **both Android and iOS**, not to treat web preview as native
device proof. This workspace is Linux aarch64. It has no Java, Android SDK, adb,
emulator/KVM, macOS/Xcode, CocoaPods, connected phones, APK, or IPA. Thus **native
Gradle/Xcode compilation and real-device calling have NOT been executed**.

## Executed checks

| Check | Android | iOS |
|---|---|---|
| Expo config-plugin introspection | PASS | PASS |
| Isolated native project generation (`prebuild --no-install`) | PASS | PASS |
| WebRTC + InCallManager native autolinking detection | PASS | PASS |
| Native-platform JS production graph/assets export (`--no-bytecode`) | PASS, 7.7MB | PASS, 7.5MB |
| TypeScript (`yarn tsc --noEmit`) | PASS (shared), zero errors | PASS (shared), zero errors |
| Hermes bytecode generation on this host | BLOCKED by host architecture | BLOCKED by host architecture |
| Gradle / Xcode compile, install, physical audio | NOT RUN | NOT RUN |
| Bluetooth, locked screen, cellular network, killed process | NOT RUN | NOT RUN |

Initial full exports reached 4,226 Android / 4,141 iOS modules, then failed
executing the shipped x86-64 Linux `hermesc` on this ARM64 host. Read-only RCA
confirmed the architecture mismatch. Verification exports used `--no-bytecode`
ONLY for diagnostics. Hermes and app engine configuration were NOT changed.

Actual logs/artifacts:
- `/tmp/native-android-export.log`, `/tmp/native-ios-export.log` (original failure)
- `/tmp/native-android-js-final.log`, `/tmp/native-ios-js-final.log`
- `/tmp/linguaconnect-android-js-final`, `/tmp/linguaconnect-ios-js-final`
- `/tmp/native-prebuild-final.log`
- Isolated project location: `/tmp/lingua-native-project-path.txt`
- `/tmp/native-autolink-android-final.json`, `/tmp/native-autolink-ios-final.json`
- `/tmp/native-final-tsc.log`

No generated native directories or package changes were copied into `/app`.
Source `metro.config.js`, package entry, protected environment variables and
installed dependency versions remain unchanged.

## Code/config improvements applied

- Android12+ requests `BLUETOOTH_CONNECT` before native call/room audio setup;
  simultaneous room setup paths share one pending permission request. Denial
  does not deny microphone permission or block ordinary phone audio by design.
  Actual hardware fallback still needs the device matrix below.
- Retained existing microphone permission handling; capture explicitly requests
  `video: false`. Cancelling during a permission dialog cannot start an obsolete
  call/room audio session after the dialog resolves (identity/alive guards).
- Declared legacy `BLUETOOTH_ADMIN`; retained existing Bluetooth/audio permissions.
- Removed ignored `edgeToEdgeEnabled` Expo57 setting (Android16 mandates it).
- Icon facade now accepts React Native `ColorValue` (including native opaque
  colors), while string-only duotone math is guarded. This fixes all 16 previous
  navigation-color type errors without changing the artwork/theme.
- **No room-engine lifecycle rewrite was needed:** actual source ALREADY mounts
  a keyed `AudioSessionHost` only when an active room exists. An early hypothesis
  of an unconditional audio hook was disproved by reading the current file.

## Remaining native capability gaps / blockers

1. **No TURN relay is configured.** Authenticated ICE config supplies STUN only.
   Same-network success cannot establish cellular/symmetric-NAT reliability.
   A user-controlled open-source coturn relay can address this without a paid
   calling API, but a reachable relay host/ports and credentials are still needed.
2. **Killed-app native incoming calls are not implemented.** Current Firebase/
   ordinary notifications and iOS `voip` plist entry are not PushKit + CallKit or
   Android native call UI. Do not claim a terminated app can receive/answer calls.
3. Generated Android manifest includes foreground **media-playback** permission
   from Expo audio, not a WebRTC microphone foreground service. It does not prove
   microphone capture survives background/lock. Do not add bare permissions and
   mislabel them as a working background-call service.
4. iOS background audio / receiver / Bluetooth require physical verification of
   AVAudioSession behavior. No APNs/PushKit signing/device tests were available.
5. Versions retained: Expo57/RN0.86.3, WebRTC124.0.7, plugin15.0.1, InCall4.2.2.
   Successful graph export/prebuild does not prove C++/Java/Swift compatibility
   for that exact tuple. Native compilation remains an acceptance gate.
6. Rooms remain P2P mesh, not SFU; do not promise unlimited participant scalability.

## Real-device acceptance matrix (pending)

On two Android phones and two iPhones (plus Android↔iPhone):
- Fresh microphone permission: allow, deny, retry; no camera prompt for audio.
- Ordinary caller uploaded MP3, receiver original ringtone; accept/reject/cancel/
  timeout stop tones. Random Practice retains original WAV on both sides.
- Bidirectional audio, mute, speaker/receiver, wired headset and Bluetooth attach/
  detach; no leftover mic indicator or audio after leaving.
- Room host/listener/speaker promotion+demotion; minimize/reopen; switch/end/kick;
  free quota warning and removal, VIP unlimited.
- Lock/unlock, app background, incoming system call interruptions and process kill.
- Same Wi-Fi, distinct Wi-Fi, Wi-Fi↔cellular, network switch/reconnect. Once TURN
  exists, force relay in a test build and verify selected relay candidates.

Record phone OS/model, app build identifier, actual peer connection stats and
redacted device logs. Browser emulation or unit stubs are not acceptance evidence
for these hardware/native OS behaviors.