# Android EAS missing-lockfile failure

## Confirmed root cause from supplied logs
The EAS app-bundle command exits1 with `No lockfile found in the project directory`.
The app declares `packageManager: yarn@1.22.22`, but had only npm's package-lock.json
and no yarn.lock. The outer build's Yarn install did not produce a saved Yarn lock.
This is before Gradle compilation and is NOT a MongoDB Atlas error.

## Code/config-only fixes
- Generate a genuine Yarn1 lock through the package manager; native generated
  entries have HTTPS resolved URLs and integrity metadata. No lockfile-check bypass.
- Remove competing frontend/package-lock.json; explicitly retain yarn.lock in
  frontend/.gitignore and frontend/.easignore.
- Add actual required peers through Expo's package installer: expo-asset,
  @expo/log-box, @expo/dom-webview, @babel/core/runtime,
  @react-native/metro-config, emojibase. SDK remains57/RN0.86.3; Expo patch57.0.24.
- The new .easignore retains the frontend .env rewritten by the build script with
  public app configuration, since the log confirms there are no EAS environment
  values. Other env/signing/private service-account files remain excluded.
- Docker/Kubernetes/supervisor/entrypoint/Metro/main/protected environment
  values/database data were NOT changed.

## Verification so far
- yarn install --frozen-lockfile --non-interactive: PASS.
- Lock parser success, all74direct dependencies locked,0invalid resolvedURLs.
- TypeScript no errors; fresh Expo CLI config works.
- Tester52 isolated CLEANyarninstall--frozen-lockfilePASS; lockhashunchanged,
  all74directdepsandpeerpathsresolved; archiveignorechecksPASS.
- TypeScript+Android/iOSJSexportsPASS; realQAlogin/all5tabs/ChatpickerSMOKEPASS.
- NativeHermesbytecodecan'texecuteintheARMsandboxwithbundledx86compiler; official
  --no-bytecodeJSexportsareNOTsignedAAB/deviceproof.
- Pendingfinaldeployment-agent reassessment and authenticFirebaseclientalignment.

## Separate next-build blocker requiring a REAL Firebase client
The supplied build pipeline overwrites android.package to:
`app.emergent.elevatefamiliarebcc2e16`.
The current google-services.json only contains:
`com.emergent.communityspeak.z97eev` and `com.mello`.
That file cannot satisfy the Google Services Gradle plugin for the logged build
package. Need an authentic google-services.json downloaded after registering
the ACTUAL final Android applicationId in the user's Firebase project, or the
build service must be configured to preserve an already-registered applicationId.
Do not relabel another client's JSON, invent an appId, remove Firebase or disable
push to hide this mismatch. No private Firebase admin/service-account key needed
for this client configuration fix.

## Log lines which are NOT the fatal failure
- `expo: command not found` is in the external build-wrapper shell and the
  wrapper continues afterward. Project-local `yarn expo` works. Do not add Docker
  or global binary hacks in app lifecycle scripts.
- No Git root falls back to current project directory; EAS_NO_VCS mode proceeds.
- Deprecated transitive package warnings / package install-script warnings are
  not the exit1 cause shown here.

## Avoid repeating failed approaches
- synp conversion of the npm v3 lock generated bare-version resolved fields
  (e.g.1.4.10), not valid URLs. Deleted that entire temporary lock; final Yarn lock
  was generated natively and passed install. No custom converter retained.
- Expo installer initially lost a loaded CLI path while converting existing npm
  node_modules layout to Yarn. Dependency installation/lock generation succeeded;
  fresh-process Expo config works, so no library workaround/downgrade added.