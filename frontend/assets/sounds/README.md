# Call sounds

- `ringtone.wav`: existing incoming ringtone; also retains the original Practice
  outgoing tone. Not replaced or edited in this increment.
  SHA-256: `380ff60a531390684e77173bc66606f9660c0e0805208a82df8ff0c41a3d876a`.
- `outgoing-call.mp3`: user's exact uploaded 22.224-second ringback (888,960 bytes).
  Used ONLY by the caller of ordinary private calls, at player volume 0.16.
  Loops while Calling/Ringing, stops on acceptance/termination. Not a voicemail
  service; this audio contains ringback tones only. No trimming or transcoding.
  SHA-256: `d4ecc39c6993ea9c274e13e3b1e85406650e5633be2c5629a43d2f44a1dcc2a1`.
  User-provided source:
  https://customer-assets-v7afamib.emergentagent.net/job_elevate-familiar/artifacts/4ujvcwzq_call%20going%20to%20voicemail%20-%20sound%20effect_%5Bcut_22sec%5D.mp3

These are bundled assets, not runtime third-party audio requests. Incoming stays
at volume 0.35 with its existing native vibration. Practice outgoing stays at 0.16
with `ringtone.wav`. No voice-room or voice-message sound is changed.