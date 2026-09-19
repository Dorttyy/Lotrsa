# Legacy preview audio asset compatibility

Current application code imports the canonical, bundled files from media/sounds.
Older links and QA messages may request /assets/sounds/ringtone.wav or
/assets/sounds/outgoing-call.mp3. Metro removes its /assets prefix and resolves
those URLs relative to the project root, hence this sounds/ folder.

These are real byte-identical audio files, not placeholders or empty directory
workarounds. Keeping relative source files is portable across archives/build
roots, unlike an absolute /app symlink. No Metro/Docker changes are necessary.
Do not replace app require() imports with remote URLs; native remains offline.