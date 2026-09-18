# RevenueCat — native SDK / Test Store wired, live fulfilment pending (2026-09-18)

## Identifiers
- rc_project_id: projd0704266
- apple_app_id: appf2cf9db92c
- play_app_id: app8bba82f195
- entitlement_lookup_key: pro
- offering_lookup_key: default
- Android package and iOS bundle: com.emergent.communityspeak.z97eev
- Packages: $rc_monthly -> prodb64d1dc626; $rc_annual -> prod6fa8a2ab9e
- Setup confirms pro attached to 6 Test/Apple/Play mirror product records.
- Dashboard: https://app.revenuecat.com/projects/projd0704266
- Real public SDK keys retrieved from sandbox+production build-config and stored ONLY frontend/.env, exposed via app.config.js extra.revenueCat. No REST API key supplied.

## State and boundaries
- FINAL BLOCKER CONFIRMED, escalated support_agent: properSDKTestStore'Testvalidpurchase' completesreceipt but NOTexpectedactive.pro. ActualSDKnetworkresponse070118: defaultoffering $rc_monthly->monthly,$rc_annual->yearly,$rc_lifetime->lifetime; subscriber.entitlements keys ONLY `elevate_familiar_pro`; subscriptions keymonthly; original_app_user_id correctQAUUID. DoNOTswitchappentitlementarbitrarilyormanuallygrantVIP. Sourceexpects`pro`fromsetupcontract; exactupstreammapping/metadataissueunresolved. NativepaymentsmustremainOFF.
- Correct documentedidempotent `/products` upsert rerunpreserving9.99USD/P1M and79.99USD/P1Y; returned SAMEpackageproductIDs and proattached6, didNOTfixruntime mismatch. RequestschemaMUSTbe {products:[{package:'$rc_monthly',price:9.99,currency:'USD',period:'P1M',prices:[{amount_micros:9990000,currency:'USD'}]},...]} (flatpackage_idbodyreturnedbad_request,nochange). No7daytrialconfigured.
- VERIFIED keysNOTwrong: currentbuild-configall3keys match.env; browserSDKAuthorizationSHA256matches.envtestkeybooleantrue (070421), ambientenvnotshadowing. Don'trevertwebEXPO_PUBLICfallback orfabricatekeys. Expectedkeyhashusedonlydiagnostic, noactualSDKkeyinfilesexcept.env.
- support_agent outputreportedplatformprovisioning inconsistency andaskedcontact support@emergent.sh withjob/project/package/safeSDKlogs. ResponsewasrelayedVERBATIMto user. Supportdidnotactuallyfix/escalatecasewithticket. Safeevidence /root/.emergent/automation_output/20260918_070118/console_20260918_070118.log, 070421keymatch. NOTE responsecalledotherentitlementinactivewithoutfullstatusproof; definitiveevidenceisexpectedproabsent/otheridentifierpresent, notitscurrentexpiry.
- NewguardUI: ifSDKactiveSubscriptionsexistsbutnoactive.pro, showsetup-errorandhidebuytopreventrepeatpurchase. Purchase/restorewithoutproshowsactionablemappingerror, nevervagueprocessing/success. KnownruntimeTestStoremonthlyexpiriescan befast, so preserveall/subscriptiondiagnosticsifinvestigatinglater.
- SDK deps installed via `yarn expo install`: react-native-purchases, react-native-purchases-ui, @tanstack/react-query. `src/billing/revenuecat.tsx` initialized once at root module scope, provider inside AuthProvider, auto SDKlogIn/out, strict stableuserID check, TanStackofferings/customerinfo, cachelisteners, async purchase+restore. `/vip` custompaywall rendersONLYrecurringpackagesfromSDK, priceStringlocalcurrency, explicitTestStorebanner/confirmation; no webbilling cardentry.
- Main browsercheck: .envkeys/extra required directEXPO_PUBLICfallback onwebSDK57(RCAconfirmed); afterfixofferingpricesfetchedwithoutbillingerror, buybuttonready. InitialSDKpreviewofferingincludedLifetimewhichwasfilteredoutbymanagedrecurringonlyscope. Fullpurchase/restoretestpending.
- IMPORTANT realproductionpurchaseguard `livePurchasesReady=false` intentionallyprevents chargingwithunfulfilledserverVIPfeatures. SDKactivepro doesNOTwriteuserVIPfromclient. Native/productionpurchaseflowNOTcomplete untilsecurefulfilment+storeconsole setup. Restore canreadexistingentitlements. ThisguardmustNOTberemovedwithouttrustedserverentitlementdelivery.
- RemovedlegacyselfVIPgrantandinstantcoins endpoints410; marketVIPcoinbuy/diamondVIPredeem410. FrontendConnectGetVIP/Market/Redeemroute `/vip`, Coinspagehonestlyshowsstorepacksetupneeded,nohardcodedKZTprice/instanttopup. Gift/sticker/profileitemsremaincoinpurchases;existingbalancesuntouched.
- User explicitly connected RevenueCat and requested proceed. Status connected; setup succeeded, entitlement mapping nonempty.
- Use integration proxy for project/products changes; do not directly call RevenueCat REST APIs or persist authorization values here.
- Managed playbook covers recurring subscriptions only, NOT consumable coins/lifetime. Do not present fake coin topup as a real Play purchase.
- Store products/Play service JSON/Apple p8 remain manual store-side prerequisites for actual device purchases. Test Store is simulation only, labeled in UI and explicitly confirmed before test purchase.
- Existing app has server-enforced VIP via users.is_vip, while managed playbook is client-only entitlement. Do not grant backend VIP from a client bool or unverified token. Secure native-store verification/backed entitlement sync needs separate resolution before claiming all server VIP features unlock from purchase.
- User's once/account+device 7day trial needs eligibility/integrity plan; no auto-renew trial configured yet, no guarantee device-once from local storage.

## Live store steps
Configure matching active products and base plans in Play Console/App Store Connect, upload store credentials in the connected billing dashboard, then test actual signed Play/TestFlight builds. SDK prices come from store product priceString, not profile-country hardcoding. Existing coin balance is not a fiat balance.