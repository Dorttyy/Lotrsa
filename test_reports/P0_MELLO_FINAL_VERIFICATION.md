# Mello — final verification and handoff

## Latest accepted layout / reaction rules
- Both cards use the identical258px-max width and x coordinate (not equal heights).
- The original text/voice preview is above the emoji bar, action list below.
- A user may react to any number of messages, but only once per message.
  Different emoji replaces; same emoji removes; another user's choice is preserved.
- Full3979Unicode17 emoji+skin catalog, search/categories, offline native grid.
- Floating badges cross the outer bottom border;22px spacing prevents overlap.

## Verified observations
- Finalcombinedbackendrun **22/22PASS**, JUnit `/app/test_reports/pytest/mello_final.xml`.
  FinalTypeScript/newreactioncomponentslintPASS; iOS+AndroidJSexports withnewfullpicker
  PASS(`/tmp/mello-native-final.log`, output`/tmp/mello-native-final`).
- `automation_output/20260918_154657`: old wide layout passed4viewports;
  fullpicker3979/unicornadd/remove, exact border geometry confirmed.
- **Superseding final width** `automation_output/20260918_173029`: text+actualvoice
  emoji/actioncards both258px. Fresh QA message mutation responses confirmed
  heart→unicorn =1user reaction; unicorn again=0; independent🙏reactions on2messages.
- `automation_output/20260918_173038`: final320×350voice popup both258px,
  finalMulti-select fullyhit-testable; fullpickeropens and Back keepsvoicecontext.
- Backend pytest49:13/13 afterlocaltranslation/emoji/performancefixes.
- Backend pytest50:6/6 singleuseradd/replace/remove,multiusercount,persistence.
- Backend pytest51:3/3 entire3979catalog validates,invalidinputs422,
  longZWJskin/familyemoji persistence/counts.
- New component lint, Pythonmodels/translation lint, TypeScript:PASS.
- PriorP0 tester47 mainflow6sizes; tester48 108checks(36routes×3sizes).
  Main filled-draftSend bounds+trial-click5sizes forChat/Comments:PASS.
- RealChat localtranslation, realunsupported-source422 thenrealretry, draftuse,
  textlongpressTranslation:PASS. OfflineM2M100, no paid/API inference fallback.

## Disposition of tester reports
- Iteration50 popup failure: rawmouse helper usedoffscreenbboxwithoutscroll;
  resolvedtypedtextselectors+auto-waitedscroll/click. Iteration51 confirmedclosed.
- Iteration51 same-remove follow-up: finalUItest waitedREALmutationHTTPack+
  entirebackdrop hidden onfreshQAfixture. ADD/REPLACE/REMOVEallpassed;
  groupedbadge maycorrectlyremainwhenotherusersstillreact, notfailedremoval.
- Initialvoice resizefollow-upstaleDOM causedonescriptassertionfailure;
  dedicatedalready-smallviewport173038passed. Originalreportnotrewritten.
- Adaptiveicon coloredartmaxradius327.87<330safe circle. Nonbackgroundpixel
  auditincludedoriginalgraydrop-shadow; no coloredartclipping.
- /learn/goal legacylink nowredirectstotheactual/set-goalscreen.
- Audio rawassetpath nowmedia/sounds; HTTP200andexportincludesbothbyte-identical
  originals. OldsoundsENOENT logentriesnotcurrentrequests.

## Honest limits / remaining build acceptance
- Browser resizing is NOTrealOSkeyboard/notch/font-scale orall131routesproof.
- No actualtutorbookingdata, so bookingformwasn't fabricatedforpassingtests.
- Native iOS+Android JSexport(--no-bytecode)PASS; defaultHermesbinaryx86/ARM
  container mismatch is environmental. No signednativebinary/deviceclaim.
- Nativepush: config/FirebaseIDs match,handlerdedupe/tokenrefresh audited.
  Currentpreviewserverkeyplaceholder gives503registration; realpushdelivery
  requiresbuildcredentials/serviceaccount/APNs/provisionedkey+physicaltests.
- No mocked app integrations added. Existing deferredbilling/ads/SFU tasks
  remainoutsideapprovedscope; nothingwasactivatedtosimulateactualpayments/push.