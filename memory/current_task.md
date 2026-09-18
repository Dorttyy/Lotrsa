# Current task — UI update delivered; verified scope and limitations

## AUTHORITATIVE CURRENT STATUS (supersedes all older planning notes below)
- User approved A for new3pageintro/sharedmic/UIchecks andQA-onlySent/Seen testing; most recent task is minimal login/signup like reference with NO Guest Mode. Implemented actualemail/password design only; no dummyGoogle/Applebuttons.
- Auth screen now singlecleanwhite/navysurface, centeredLogin/Signup, subtle54ptfields, solid52ptpillCTA, inlinebottomswitch, safescroll/KAV/insets, accessiblepasswordtoggle/autofill/keyboardfocus, duplicate-submit guard. RealAuthContext/backendcontracts unchanged. ExistingForgotPassword explicitlyunavailable; noresetserviceintegrated.
- welcome.tsx now3page publicintro with originalcollage/globe/rings, base64stockportraits, nativehorizontalpager, verticalscrollfallback, 44ptpagination, signup/loginCTAs and reducedmotion animation. Existing5postsignup profile/language/DOB/gender/intereststeps unchanged.
- MicGlyph/Nav Voice use SAME uploadednavbarPNG; mutedglyph sameimage+slash. Fiveuploadedactionicons globallymapped (lightning/bell/call/speakermute/menu), mutedmicrophone/notifoff/volumelevel semantics preserved. Navbar order/gendericons unchanged.
- Chatheader24->18pt; Moments24->28pt; Delivered label -> Sent, Seen/serverlogic unchanged.

## TESTING-AGENT VERIFIED (real API/browser, no mocks)
- Backend9/9 auth/readinessPASS; guestAPI404, twoQAusers login/me, wrongpassword401; boundedQAconversation created98ea1271-de38-4a76-8be9-c24210657858.
- Browser3intropages,pagers/swipe/signup+loginlinks,320x568/390x844/430x932layouts passed withfooterreachable/nohorizontaloverflow.
- MinimalAuth form,toggle,passwordshowhide,validation,wrongpassword,realQAlogin->Connect PASS. RealNEWsignup201->onboarding PASS; first2postsignup steps exercised. NewQAcredential istrackedinmemory/test_credentials.md.
- Chat18pt+smallwidthtruncation andactualSent receipt(noDelivered) PASS. Laterisolatedtest verifiedMoments28px and exactuploadedbell+call+microphonePNGdataURIs. Dailycheckin isnormalwithEXISTINGcheckin-close-btn; noappmodalpatchneeded.
- Lintpasses;27PRE-EXISTING TSCerrors remainelsewhere,noneintroduced.

## NOT VERIFIED / NOT IMPLEMENTED
- Real-timeSent->Seen twoaccounttest didNOTexecute. Agentusedundefinedbrowservariable (NameError) despitepage-onlytool; reportthis as unverified, NOT appfailure. Do notclaimSeenpassed. Futuretester can investigate obtaining browser via page.context.browser or use approved devices; doNOTsimulateReads.
- Darktheme runtime,full5steponboardingcompletion,nativeOSkeyboard/safeareas,WebRTCaudio/TURN/SFU,Android/iOSbuilds notverifiedthisincrement.
- OptionalAI remainsunconfigured503, passwordreset/GoogleApple unavailable. Externalcross-originOPTIONSissue unchanged; sameoriginloginworks. No production-readyclaim.
- Earlier testers called toolbudgetexpiry a sessionfailure; troubleshootconfirmedNOTJWTfailure. Earlier broad 'allverified' statements wereoverstated; useonlyexactchecksabove.
- Existingfreshenv/DB/JWT MUSTremain; no newsecrets/databases ordata deletion. Generatedbackend_test.pyhasformattingwhitespaceonly; appsourcechanges passdiffcheck.

## Historical planning notes (not current blockers)

## Latest approved implementation — awaiting runtime UI checks
- User approved A for exact5globalactionicon replacements+focusedUIchecks. Added src/assets/action-upload-icons.json (exactbase64PNGbytes), src/ui/UploadedActionIcon.tsx and sharedicons dispatch for flash/bolt, notification/bell, call/phone, volume-mute/off and menu/reorder aliases. Existing size/color/transforms preserved; mic-off/bell-off/volumelevels/ellipsis unaffected in this increment.
- User added chatprofiletitle too large -> headerName24to18/line24 with48minimum hitarea; Moments title24to28/line34, no card/message typography changes.
- User requested Delivered wording -> Sent; only chat receipt text/comment changed. Seen condition/checkmarks and serverlogic untouched.
- Backend/static tests passed5health,8iconasset/alias,6style/receiptchecks; no newTSCissues (27pre-existing). RuntimeUI checks still pending. No existing conversation between the two current QAaccounts; if testing real Sent/Seen needs QA-only conversation/message creation, not fakeauth or realcontacts.

## Newest request — minimalist login/signup reference (confirmation pending)
- User uploaded bdkpj439_5a695a55cecf5274086d7f8d1aa3bd44.jpg: white minimal auth screen, centeredLogin, subtlefields, pillbuttons, darkgreen/lime accents, Google/Apple options andGuest. User explicitly says NO Guest Mode.
- Existing real email/password auth works. GoogleLogin backend method exists but no configured socialfrontend flow; Apple not implemented. Do NOT add fake Google/Apple buttons. Clarify email-only visual adaptation vs real provider integration/credentials. No new authdesign applied yet; preserve existing configuration and contracts.

## Three-page intro and shared microphone — implemented, testing pending
- User explicitly approved A for3intro+globalmic+focusedtests AND creation of a QA-only test conversation/messages for Sent/Seen checks. User additionally requires testing-agent verification before claiming bugs fixed.
- welcome.tsx now re-exports WelcomeIntroScreen. New src/components/welcome/WelcomeIntroScreen.tsx has3horizontalpaging slides,44ptindicatorbuttons,GetStarted->auth/register andLogin->auth/login,verticalscrollfallback,safeareas,Reanimatedfade/translate respecting reducedmotion. No featureclaims/statistics fabricated.
- WelcomeArtwork.tsx builds original portraitconversationcollage,illustrativeglobe,connectionrings. New welcome-portraits.json has3vision-selectedphotos bundledbase64 (~85KB); decorative,NOT actualmemberprofiles. One vision_expert call used (max2 total). Photos selected1534528741775-53994a69daeb,1520529277867-dbf8c5e0b340,1518725522904-4b3939358342. Preview firstslide screenshot renderedcleanly but NOT runtimeverification.
- MicGlyph.tsx now uses exactnavbarUploads.voice PNG viaRNImage; MicOffGlyph overlaysdiagonalSVGslash. NavIcons.VoiceIcon invokes sameMicGlyph. All existing sharedmic/microphone/voice aliases useit; speakerMute distinct. Prior unusedMicShape vectorremoved. Lint passes; TSCsame27preexistingerrors,noneintroduced.
- /onboarding.tsx required5profile/language/gender/DOB/country/interestssteps untouched. Noauth/backendenvedits.
- Need backend/staticcheck for newmic/introthenfrontendagent actual3pageswipe/buttons/mobilelayout,allglobalicons,compactchat18/largerMoments28,SentthenSeenQAonlymessages,login/signupflow. Do NOT claim verified until testingagentreport. Prior agentonlystaticchecks; baselineUIlogin/main5tabsverified butdark/secondarynot.

## Approved design reference
- Latest user: make wholeapp voice/microphone icon match navbar exact uploadedmic; preserve microphone-off slash. Shared MicGlyph currently STILL oldvector, not yet replaced. Action speaker-mute upload remains separate.
- Latest user: THREE publicintro/onboarding pages like uploadedPortra references but different content. Existing welcome.tsx is one public landing; onboarding.tsx is five REAL post-signup requiredprofile steps (languages,country,DOB/gender,interests), MUST preserve them.
- Recommended: replace welcome with3swipeableintro slides, keepGetStarted->auth/register andLogin->auth/login on each, originalLinguaConnect art/copy; darknavy+blue/cyan glow, centeredboldheadlines, verticaltickpagination andwhiteCTA. NoPortralogo/artwork or fakeusagecounts. Newimage refs: 9f99qdck_HRrJL0AbYAACrfq.jpg,620kam8i_HRrJMXBbsAAX7p7.jpg,qvolfjww_HRrJNA7XAAAyWAC.jpg under currentassetbaseURL. Last image analyzed with analyze_file_tool; visual reference is connectionrings, others layeredportraitcards andglobe. No newintro/micimplementation done yet.
- Confirm publicintro vs replacement of requiredprofile setup; propose preserveprofile steps. UserA for earlierUIchecks exists, further realQAmessage sideeffect consent pending.

## Prior state — retained context

## CURRENT STATE — supersedes the historical audit below
- User explicitly approved a FRESH preview with "Create new". Both .env files now exist, using verified platform runtime Mongo/Expo settings. Database `linguaconnect_preview_91d577847a48` is new and distinct; no old data deleted or migrated. JWT generated privately and must NOT be rotated again.
- Backend auth tests PASSED real register/login/me, invalid credentials/token rejection, bcrypt storage, onboarding profile persistence and survival after backend restart. Current admin + QA credentials are in test_credentials.md; do not use old demo passwords.
- Removed import-time optional-AI secret requirement. Paid AI returns503 when unconfigured; free translation path preserved. Synthetic Pro tutor seeding disabled by SEED_DEMO_TUTORS=false, functionality retained. No fake auth or users/rooms added as product data.
- User then requested REMOVE Guest Mode. Removed guest button, local guest browsing screens/state/redirects and /api/auth/guest creation endpoint. Obsolete persisted guest flag is cleaned. AuthRouteBoundary now requires real user for all routes except index/welcome/auth; existing login/register/onboarding/navigation remain. No account records deleted. Backend regression PASSED10/10: guest creation404 with no new records; real login/register/me/admin preserved; optional AI503 correctly isolated.
- Latest user upload mapping implemented with exact original PNG bytes in src/assets/navbar-upload-icons.json: #1 microphone Voice, #2 communication Chats, #3 group Connect, #4 yin-yang Moments. Existing tab order and gender-based profile uploads retained. Theme tint/focus spring unchanged; in-app microphone icons outside navbar untouched.
- ESLint passes changed files. NavIconProps ColorValue fix removed5 former diagnostics; global TypeScript still reports27 PRE-EXISTING errors in other modules, none new.
- Frontend runtime/UI testing remains pending user permission (previous user preference was self-testing). Do not claim UI/native authentication or icons visually verified on-device.
- Known external limitation: public cross-origin OPTIONS preflight400 upstream, local backend exact-origin OPTIONS200 (troubleshooter confirmed). Same-origin requests pass; do not change protected origin/ports to bypass. Existing password-reset button is still a placeholder; full app/audio/build verification not done.
- Next: backend regression test guest endpoint absent and normal auth unchanged; ask permission for frontend testing. No further redesign now.

## Historical audit — PRE-FRESH-SETUP, retained only for context

## User direction
User speaks Bengali. They approved best-judgment work, requested onboarding inspired by the uploaded reference, and urgently reported signup/system failure. Fix authentication first; retain all existing core routes/features. Pause after first verified value addition before broad redesign.

## Confirmed current blocker
- `/app/backend/.env` and `/app/frontend/.env` are absent.
- Backend required `MONGO_URL`, `DB_NAME`, `JWT_SECRET` unavailable; worker import fails at db.py:13 with KeyError MONGO_URL. Supervisor RUNNING is the parent process, not evidence of a healthy API.
- Frontend api.ts references missing `EXPO_PUBLIC_BACKEND_URL`.
- Two read-only troubleshooting investigations found no recoverable original configuration. Do not repeat searches unless configuration changes.
- Auth playbook reviewed: preserve accounts/contracts/hashes; no guessed DB URL, new database, or JWT rotation without explicit authorization.
- Authentication code, database, and environment files remain unchanged. Signup remains BLOCKED. Backend-only testing confirmed GET /api/ connection failure; no working registration/login was verified.

## Delivered increment — gender-based profile navbar icon
- User approved the implementation and selected B = they will test the UI themselves. This B does NOT authorize database reprovisioning or signing-key rotation.
- Main tabs now pass saved `user?.gender` to MeIcon. Male uses the exact first uploaded PNG, female uses the second; null/unknown retains original neutral SVG.
- Uploaded PNGs are bundled as base64 in `frontend/src/assets/profile-nav-icons.json`; no network image download on navigation. RN Image tintColor follows tab theme and active/inactive colors. Existing spring, icon size, safe area, unread dot, and actual avatar unchanged.
- Modified code: `frontend/src/ui/NavIcons.tsx`, `frontend/app/(tabs)/_layout.tsx` only. No other icons/routes or API contracts altered.
- ESLint passes. TypeScript shows 32 pre-existing compatibility errors; testing agent confirmed no new diagnostics caused by this change. Automated UI testing declined by user; only a non-interactive welcome screenshot captured. Runtime gender icon verification remains for user once authenticated access is restored.

## Existing auth contracts to preserve
POST /api/auth/register {email,password,name} -> {token,user}; POST /api/auth/login {email,password} -> {token,user}; GET /api/auth/me Bearer token -> user. New users route to /onboarding, existing configured users to /(tabs)/connect. Existing credentials in test_credentials.md are historical, unverified on this environment.

## Visual reference
Asset: https://customer-assets-v7afamib.emergentagent.net/job_elevate-familiar/artifacts/8enbp5b5_e49b338e108972bc4251847b53ba4ff3%20%281%29.jpg
Analyzed: lime/black/white, bold compact headlines, diverse photo collage, rounded CTA and option cards, explicit progress. Use inspiration, not exact logo/photos/copy/compositions. Existing onboarding data and navigation must remain functional.
Current main app: sky-blue light / navy dark, Inter typography, 8/16/24 radius scale, five tabs Chats/Connect/Moments/Voice/Me. Do not adopt stale purple/emerald PRD descriptions as source of truth. SDK57/RN0.86.3/React19.2.3 already declared, verify before any upgrade.

## Protected configuration — NEVER MODIFY during app-code work
- `/app/frontend/metro.config.js`
- `/app/frontend/package.json` main = expo-router/entry, preinstall/postinstall required hooks
- Existing event-target-shim patch under frontend/patches; do not remove
- `/app/frontend/.env` framework host/proxy/API URLs and `/app/backend/.env` database URL (currently missing; restoration needs approved source)
- `/app/config.json`, `/app/entrypoint.sh`, platform supervisor routing and ports
- Existing iOS/Android app identifiers, deep-link scheme until a specifically approved migration
- `.git` and `.emergent` directories; no git writes
- `test_result.md` Testing Protocol block
Pre-existing working-tree edits in tests/reports/PRD/platform files are not ours; do not revert.

## Next step
User explicitly selected option A: restore original configuration, NOT reprovision or rotate JWT keys. They again reported "Sign up login not working". Rechecked: both .env files still absent and same import failure. Latest troubleshooting reports current local Mongo has only system databases; this does NOT establish loss of any external/original database. No code, key, database, or environment changes made. Support guidance requested for platform-level original project environment recovery; support tool provides guidance only and did NOT create a ticket or restore anything. It recommends contacting support@emergent.sh with job b6fa62e5-6b4e-4ef1-a6e8-9e4c1ae8fdfb. Do not repeat exhaustive recovery searches without new configuration/source information. Once approved original config is restored: backend testing first, then request UI testing permission, validate signup -> onboarding -> persistence/login. Signup/login remain BLOCKED. Reference-inspired onboarding remains unimplemented.
