# Mello native notification checklist

## Confirmed in source/config (2026-09-18, updated after build configuration changed)
- The build configuration was updated externally during testing49. Current
  Android package and iOS bundle identifier: `com.emergent.communityspeak.z97eev`.
  Current supplied google-services.json (Firebase project mello-16ce3) includes
  this EXACT Android client. No mismatch; do NOT restore the earlier identifiers
  from historical notes or replace them merely because display name is Mello.
- Previous audit matched the old com.emergent.lingua Android package; its claim
  is historical, superseded by current actual files. Main agent did not edit
  package/bundle identifiers or supply fictitious Firebase client credentials.
- expo-notifications plugin, Android googleServicesFile, POST_NOTIFICATIONS,
  remote-notification background mode and white/alpha notification icon present.
- Native FCM/APNs tokens (NOT Expo tokens) register only after permission.
- Registration uses authenticated `/api/register-push`; server overrides any
  supplied user ID. No raw device token is logged/stored in our database.
- Auth-ready NativeNotificationBridge is the sole tap owner, deduplicates warm
  and cold-start responses, clears the handled response, guards internal routes.
- Token rotations and foreground resumes re-register. Foreground presentation
  and Android default channel created once at root module scope. Web/Expo Go are
  intentionally guarded; neither verifies real remote push delivery.

## Required at native build/signing (not supplied by app source)
- Android Firebase service-account JSON (different from google-services.json).
- iOS APNs `.p8` signing key / team/key IDs and matching signing entitlement.
- The managed build pipeline replaces the backend EMERGENT_PUSH_KEY placeholder.
  Current preview has placeholder; `/api/register-push` explicitly returns503,
  not a fabricated success. Do not reuse an LLM key or invent a push key.
- Existing installed Android channel preferences are OS-owned; code cannot
  overwrite user-muted sound/importance. Android force-stop prevents pushes
  until reopening (OS restriction).

## Physical acceptance matrix still required
On real installed Android + iOS builds, use two existing accounts/devices:
1. Allow permission -> confirm registration201 (never log raw device token).
2. Message/call/activity while foreground, background, and app terminated.
3. Tap: open intended conversation/post/call ONCE, including a cold start.
4. Sign out/in, rotate token/resume, denied permission then enable in settings.
5. Confirm lock-screen privacy, notification sound, safe-area/keyboard layouts.

No on-device push delivery has been claimed from web preview checks.