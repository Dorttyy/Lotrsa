import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import Constants from "expo-constants";
import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/src/context/AuthContext";

export const ENTITLEMENT = "pro";
export const isTestStore = Platform.OS === "web" || __DEV__;
// Never charge a live customer before this app's server-enforced VIP benefits
// can be fulfilled from an authenticated store event/verified transaction.
// Native SDK wiring is ready; verified server fulfilment is a remaining step.
export const livePurchasesReady = false;
const enabled = Platform.OS !== "web" || __DEV__;
const queryClient = new QueryClient();
let initialized = false;
let initError = "";

/** Called exactly once at root-module scope, never from a React component. */
export function initializeRevenueCat() {
  if (initialized) return;
  if (!enabled) { initError = "Purchases are available in the Android or iOS app."; return; }
  if (Platform.OS === "web" && typeof window === "undefined") return;
  try {
    const keys = Constants.expoConfig?.extra?.revenueCat || {};
    const apiKey = isTestStore
      ? (keys.testApiKey || process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY)
      : Platform.OS === "ios"
        ? (keys.iosApiKey || process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY)
        : (keys.androidApiKey || process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY);
    if (!apiKey) throw new Error("Store configuration is unavailable.");
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
    Purchases.configure({ apiKey });
    initialized = true;
  } catch (error) { initError = error instanceof Error ? error.message : "Store is unavailable."; }
}

function useSubscriptionState() {
  const { user } = useAuth();
  const cache = useQueryClient();
  const [identityReady, setIdentityReady] = useState(false);
  const [identityError, setIdentityError] = useState("");
  const boundUser = useRef<string | null>(null);
  const serial = useRef(Promise.resolve());
  const epoch = useRef(0);
  const userId = user?.id || null;
  const customerKey = ["revenuecat", "customer-info", userId];

  useEffect(() => {
    const version = ++epoch.current;
    setIdentityReady(false); setIdentityError("");
    if (!initialized) return;
    serial.current = serial.current.catch(() => {}).then(async () => {
      if (version !== epoch.current) return;
      try {
        if (userId) {
          const { customerInfo } = await Purchases.logIn(userId);
          boundUser.current = userId;
          if (version !== epoch.current) return;
          if (customerInfo.originalAppUserId !== userId) throw new Error("Purchases are waiting for your account to be linked.");
          cache.setQueryData(["revenuecat", "customer-info", userId], customerInfo);
          setIdentityReady(true);
        } else if (boundUser.current) {
          await Purchases.logOut(); boundUser.current = null;
          cache.removeQueries({ queryKey: ["revenuecat", "customer-info"] });
        }
      } catch (error) {
        if (version === epoch.current) setIdentityError(error instanceof Error ? error.message : "Could not link your account to the store.");
      }
    });
  }, [userId, cache]);

  const customer = useQuery({ queryKey: customerKey, queryFn: () => Purchases.getCustomerInfo(),
    enabled: initialized && identityReady, staleTime: 60000, retry: 1 });
  const offerings = useQuery({ queryKey: ["revenuecat", "offerings"], queryFn: () => Purchases.getOfferings(),
    enabled: initialized && !!userId, staleTime: 300000, retry: 1 });

  useEffect(() => {
    if (!initialized || !userId) return;
    const listener = (info: CustomerInfo) => {
      if (boundUser.current === userId && info.originalAppUserId === userId) cache.setQueryData(["revenuecat", "customer-info", userId], info);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => { Purchases.removeCustomerInfoUpdateListener(listener); };
  }, [userId, cache]);

  const purchaseMutation = useMutation({ mutationFn: async (item: PurchasesPackage) => {
    if (!isTestStore && !livePurchasesReady) throw new Error("Live purchases are not enabled until secure VIP activation is configured.");
    if (!identityReady || !userId || boundUser.current !== userId) throw new Error("Your purchase account is not ready yet.");
    const info = await Purchases.getCustomerInfo();
    if (info.originalAppUserId !== userId) throw new Error("Please wait for your account to be linked.");
    return (await Purchases.purchasePackage(item)).customerInfo;
  }, onSuccess: info => { if (info.originalAppUserId === userId) cache.setQueryData(customerKey, info); } });
  const restoreMutation = useMutation({ mutationFn: async () => {
    if (!identityReady || boundUser.current !== userId) throw new Error("Please sign in before restoring purchases.");
    return Purchases.restorePurchases();
  }, onSuccess: info => { if (info.originalAppUserId === userId) cache.setQueryData(customerKey, info); } });
  const entitlement = customer.data?.entitlements.active[ENTITLEMENT];
  return {
    customerInfo: customer.data,
    packages: (offerings.data?.current?.availablePackages || []).filter(item => item.packageType !== "LIFETIME" && (!!item.product.subscriptionPeriod || item.packageType === "MONTHLY" || item.packageType === "ANNUAL")),
    isSubscribed: !!entitlement, entitlement, identityReady,
    hasUnmatchedSubscription: !!customer.data?.activeSubscriptions.length && !entitlement,
    error: initError || identityError || (offerings.error instanceof Error ? offerings.error.message : ""),
    loading: (!!userId && !identityReady && !identityError && !initError) || offerings.isFetching,
    purchase: purchaseMutation.mutateAsync, restore: restoreMutation.mutateAsync,
    purchasing: purchaseMutation.isPending, restoring: restoreMutation.isPending,
    refresh: () => offerings.refetch(),
  };
}
type SubscriptionState = ReturnType<typeof useSubscriptionState>;
const SubscriptionContext = createContext<SubscriptionState | null>(null);
function SubscriptionStateProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionState();
  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}
export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}><SubscriptionStateProvider>{children}</SubscriptionStateProvider></QueryClientProvider>;
}
export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error("SubscriptionProvider is missing.");
  return context;
}