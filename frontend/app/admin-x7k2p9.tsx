import { Ionicons } from "@/src/ui/icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Avatar } from "@/src/components/Avatar";
import { useAuth } from "@/src/context/AuthContext";
import { fonts } from "@/src/theme";
import { api } from "@/src/utils/api";
import { SafeAreaView, useSafeAreaInsets } from "@/src/components/layout/SafeAreaView";

// ── Design tokens (light, modern, reference-inspired) ──
const BG = "#F3F4F8";              // page background
const CARD = "#FFFFFF";            // primary surface
const CARD_2 = "#F6F7FB";          // subtle secondary surface
const BORDER = "#E9EAF0";
const TEXT = "#141419";
const MUTED = "#7B8299";
const BRAND = "#0E9AE0";           // purple accent (matches app)
const BRAND_SOFT = "#E1F2EC";      // soft purple pill background
const OK = "#22C55E";              // green
const OK_SOFT = "#DCFCE7";
const DANGER = "#EF4444";
const DANGER_SOFT = "#FEE2E2";
const GOLD = "#F59E0B";
const GOLD_SOFT = "#FEF3C7";
const PURPLE = "#0E9AE0";
const ORANGE = "#F97316";
const ORANGE_SOFT = "#FFEDD5";

// Floating dark bottom nav (reference-inspired)
const NAV_BG = "#111318";
const NAV_ITEM_ACTIVE = "#FFFFFF";
const NAV_ITEM_MUTED = "#8A8A8A";

// Header (purple gradient, reference-inspired)
const HEADER_GRAD_A = "#0E9AE0";
const HEADER_GRAD_B = "#0A6B9E";

const confirmAction = (message: string, onConfirm: () => void) => {
  if (Platform.OS === "web") {
    if (window.confirm(message)) onConfirm();
  } else {
    Alert.alert("Confirm", message, [
      { text: "Cancel", style: "cancel" },
      { text: "OK", style: "destructive", onPress: onConfirm },
    ]);
  }
};

interface AdminStats {
  total_users: number;
  vip_users: number;
  banned_users: number;
  new_users_today: number;
  online_now: number;
  total_moments: number;
  total_messages: number;
  total_conversations: number;
  live_rooms: number;
  coins_in_circulation: number;
}

interface SignupPoint {
  date: string;
  count: number;
}

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  coins: number;
  is_vip: boolean;
  vip_tier?: string | null;
  is_admin: boolean;
  banned: boolean;
  restricted: boolean;
  is_online: boolean;
  country?: string;
  created_at?: string;
}

interface AdminRoomRow {
  id: string;
  title: string;
  language?: string;
  topic?: string;
  is_live: boolean;
  is_private: boolean;
  member_count: number;
  host_name: string;
  host_email?: string | null;
  created_at?: string;
}

interface AdminMarketItem {
  id: string;
  name: string;
  emoji: string;
  type: string;
  price: number;
  default_price: number;
  disabled: boolean;
}

interface AdminMoment {
  id: string;
  text?: string;
  author_name: string;
  author_email?: string;
  like_count: number;
  comment_count: number;
  has_image: boolean;
  created_at?: string;
}

interface IntegrationFile {
  id: string;
  label: string;
  description: string;
  exists: boolean;
  updated_at: string | null;
}

type AppKey = "Main" | "Premium" | "Pro";

// Bottom-nav layout: 5 primary tabs always visible (+ "More" for the rest).
// Order chosen for daily-use frequency.
const APP_TABS: Record<AppKey, { key: Tab; icon: keyof typeof Ionicons.glyphMap }[]> = {
  Main: [
    { key: "Overview", icon: "grid-outline" },
    { key: "Users", icon: "people-outline" },
    { key: "Rooms", icon: "mic-outline" },
    { key: "Moments", icon: "planet-outline" },
    { key: "Market", icon: "storefront-outline" },
    { key: "Orders", icon: "cube-outline" },
    { key: "Broadcast", icon: "megaphone-outline" },
    { key: "Integrations", icon: "extension-puzzle-outline" },
    { key: "Audit", icon: "shield-checkmark-outline" },
    { key: "Settings", icon: "settings-outline" },
  ],
  Premium: [{ key: "PremiumHome", icon: "diamond-outline" }],
  Pro: [
    { key: "ProHome", icon: "grid-outline" },
    { key: "Tutors", icon: "school-outline" },
    { key: "Sessions", icon: "videocam-outline" },
  ],
};

// The first N tabs are pinned to the bottom-nav (rest go into "More").
const PINNED_TABS = 5;

const APPS: { key: AppKey; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: "Main", label: "Main", icon: "phone-portrait", color: BRAND },
  { key: "Premium", label: "Premium", icon: "diamond", color: GOLD },
  { key: "Pro", label: "Pro", icon: "videocam", color: ORANGE },
];

type Tab =
  | "Overview"
  | "Users"
  | "Rooms"
  | "Moments"
  | "Market"
  | "Orders"
  | "Broadcast"
  | "Integrations"
  | "Audit"
  | "Settings"
  | "PremiumHome"
  | "ProHome"
  | "Tutors"
  | "Sessions";

// ── Shared bits ──
const Chip = ({ label, color }: { label: string; color: string }) => (
  <View style={[s.chip, { backgroundColor: `${color}26`, borderColor: `${color}55` }]}>
    <Text style={[s.chipText, { color }]}>{label}</Text>
  </View>
);

const ActionBtn = ({
  label,
  color,
  onPress,
  testID,
  icon,
}: {
  label: string;
  color: string;
  onPress: () => void;
  testID?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    style={({ pressed }) => [
      s.actionBtn,
      { borderColor: `${color}66`, backgroundColor: `${color}1A` },
      pressed && { opacity: 0.7 },
    ]}
  >
    {icon ? <Ionicons name={icon} size={13} color={color} /> : null}
    <Text style={[s.actionBtnText, { color }]}>{label}</Text>
  </Pressable>
);

const SectionNote = ({ children }: { children: React.ReactNode }) => (
  <Text style={s.sectionNote}>{children}</Text>
);

export default function AdminPanel() {
  const insets = useSafeAreaInsets();
  const { user, loading, login, logout } = useAuth();
  const [app, setApp] = useState<AppKey>("Main");
  const [tab, setTab] = useState<Tab>("Overview");
  const [moreOpen, setMoreOpen] = useState(false);

  const switchApp = useCallback((next: AppKey) => {
    setApp(next);
    setTab(APP_TABS[next][0].key);
    setMoreOpen(false);
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const doLogin = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setAuthBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.container, s.center]}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={s.container} testID="admin-login-screen">
        <StatusBar style="dark" />
        <KeyboardAwareScrollView
          contentContainerStyle={s.loginWrap}
          bottomOffset={24}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.loginCard}>
            <LinearGradient
              colors={[HEADER_GRAD_A, HEADER_GRAD_B]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.loginIcon}
            >
              <Ionicons name="shield-checkmark" size={30} color="#FFFFFF" />
            </LinearGradient>
            <Text style={s.loginTitle}>Admin Console</Text>
            <Text style={s.loginSub}>
              Mello · restricted area, authorized staff only
            </Text>
            <View style={s.loginField}>
              <Ionicons name="mail-outline" size={16} color={MUTED} />
              <TextInput
                testID="admin-email-input"
                style={s.loginInput}
                placeholder="Admin email"
                placeholderTextColor={MUTED}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            <View style={s.loginField}>
              <Ionicons name="lock-closed-outline" size={16} color={MUTED} />
              <TextInput
                testID="admin-password-input"
                style={s.loginInput}
                placeholder="Password"
                placeholderTextColor={MUTED}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
            {authError ? <Text style={s.error}>{authError}</Text> : null}
            <Pressable
              testID="admin-login-btn"
              style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.8 }]}
              onPress={doLogin}
              disabled={authBusy}
            >
              {authBusy ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={17} color="#FFF" />
                  <Text style={s.primaryBtnText}>Sign in</Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    );
  }

  if (!user.is_admin) {
    return (
      <SafeAreaView style={s.container} testID="admin-denied-screen">
        <StatusBar style="dark" />
        <View style={s.loginWrap}>
          <View style={s.loginCard}>
            <Ionicons name="lock-closed" size={40} color={DANGER} />
            <Text style={s.loginTitle}>Access denied</Text>
            <Text style={s.loginSub}>
              This account does not have admin privileges.
            </Text>
            <Pressable
              style={[s.primaryBtn, { backgroundColor: DANGER }]}
              onPress={logout}
            >
              <Text style={s.primaryBtnText}>Log out</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const tabs = APP_TABS[app];
  const pinnedTabs = tabs.slice(0, PINNED_TABS);
  const overflowTabs = tabs.slice(PINNED_TABS);
  const hasOverflow = overflowTabs.length > 0;

  const currentTabMeta = tabs.find((t) => t.key === tab);
  const appMeta = APPS.find((a) => a.key === app);

  return (
    <SafeAreaView
      style={s.container}
      edges={["top", "bottom"]}
      testID="admin-dashboard"
    >
      <StatusBar style="light" />

      {/* Purple gradient header — reference-inspired */}
      <LinearGradient
        colors={[HEADER_GRAD_A, HEADER_GRAD_B]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerEyebrow}>Admin Console</Text>
            <Text style={s.headerTitle} numberOfLines={1}>
              {currentTabMeta?.key || "Overview"}
            </Text>
            <Text style={s.headerSub} numberOfLines={1}>
              {appMeta?.label} · {user.email}
            </Text>
          </View>
          <View style={s.headerIconRow}>
            <View style={s.headerIconBtn}>
              <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
            </View>
            <Pressable
              testID="admin-logout-btn"
              onPress={logout}
              style={s.headerIconBtn}
              hitSlop={6}
            >
              <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
        <View style={s.appPillRow}>
          {APPS.map((a) => {
            const active = app === a.key;
            return (
              <Pressable
                key={a.key}
                testID={`admin-app-${a.key.toLowerCase()}`}
                onPress={() => switchApp(a.key)}
                style={[s.appPill, active && s.appPillActive]}
              >
                <Ionicons
                  name={a.icon}
                  size={13}
                  color={active ? BRAND : "rgba(255,255,255,0.85)"}
                />
                <Text style={[s.appPillText, active && s.appPillTextActive]}>
                  {a.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>

      {/* Main content — each tab component supplies its own ScrollView */}
      <View style={{ flex: 1 }}>
        {/* Main app */}
        {tab === "Overview" && <Overview />}
        {tab === "Users" && <Users />}
        {tab === "Rooms" && <Rooms />}
        {tab === "Moments" && <Moments />}
        {tab === "Market" && <Market />}
        {tab === "Orders" && <Orders />}
        {tab === "Broadcast" && <Broadcast />}
        {tab === "Integrations" && <Integrations />}
        {tab === "Audit" && <AuditLog onRevoked={logout} />}
        {tab === "Settings" && <Settings />}
        {/* Premium */}
        {tab === "PremiumHome" && <PremiumHome />}
        {/* Pro */}
        {tab === "ProHome" && <ProHome />}
        {tab === "Tutors" && <ProTutors />}
        {tab === "Sessions" && <ProSessions />}
      </View>

      {/* Floating dark bottom nav */}
      <View style={s.bottomNavWrap} pointerEvents="box-none">
        <View style={s.bottomNav}>
          {pinnedTabs.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                testID={`admin-tab-${t.key.toLowerCase()}`}
                onPress={() => setTab(t.key)}
                style={[s.navBtn, active && s.navBtnActive]}
              >
                <Ionicons
                  name={t.icon}
                  size={20}
                  color={active ? "#0B0B0F" : NAV_ITEM_MUTED}
                />
              </Pressable>
            );
          })}
          {hasOverflow ? (
            <Pressable
              testID="admin-tab-more"
              onPress={() => setMoreOpen(true)}
              style={[
                s.navBtn,
                overflowTabs.some((o) => o.key === tab) && s.navBtnActive,
              ]}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={20}
                color={
                  overflowTabs.some((o) => o.key === tab)
                    ? "#0B0B0F"
                    : NAV_ITEM_MUTED
                }
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* More sheet */}
      {hasOverflow ? (
        <Modal
          visible={moreOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setMoreOpen(false)}
        >
          <Pressable
            style={s.moreBackdrop}
            onPress={() => setMoreOpen(false)}
          />
          <View style={[s.moreSheet, { paddingBottom: 34 + insets.bottom }]} testID="admin-more-sheet">
            <View style={s.moreHandle} />
            <Text style={s.moreTitle}>More sections</Text>
            <View style={s.moreGrid}>
              {overflowTabs.map((t) => {
                const active = tab === t.key;
                return (
                  <Pressable
                    key={t.key}
                    testID={`admin-more-${t.key.toLowerCase()}`}
                    onPress={() => {
                      setTab(t.key);
                      setMoreOpen(false);
                    }}
                    style={[
                      s.moreItem,
                      active && { backgroundColor: BRAND_SOFT },
                    ]}
                  >
                    <View
                      style={[
                        s.moreItemIcon,
                        { backgroundColor: active ? BRAND : BRAND_SOFT },
                      ]}
                    >
                      <Ionicons
                        name={t.icon}
                        size={20}
                        color={active ? "#FFFFFF" : BRAND}
                      />
                    </View>
                    <Text style={s.moreItemText}>{t.key}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

// ── Overview ──
function Overview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [signups, setSignups] = useState<SignupPoint[]>([]);

  useEffect(() => {
    api.get<AdminStats>("/admin/stats").then(setStats).catch(() => {});
    api.get<SignupPoint[]>("/admin/signups?days=7").then(setSignups).catch(() => {});
  }, []);

  if (!stats) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  const cards: { label: string; value: number; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
    { label: "New today", value: stats.new_users_today, icon: "person-add", color: OK },
    { label: "VIP users", value: stats.vip_users, icon: "diamond", color: GOLD },
    { label: "Live rooms", value: stats.live_rooms, icon: "mic", color: PURPLE },
    { label: "Moments", value: stats.total_moments, icon: "planet", color: BRAND },
    { label: "Messages", value: stats.total_messages, icon: "chatbubbles", color: ORANGE },
    { label: "Chats", value: stats.total_conversations, icon: "mail", color: "#22D3EE" },
    { label: "Banned", value: stats.banned_users, icon: "ban", color: DANGER },
    { label: "Coins in economy", value: stats.coins_in_circulation, icon: "server", color: GOLD },
  ];

  const maxSignup = Math.max(1, ...signups.map((p) => p.count));

  return (
    <ScrollView contentContainerStyle={s.page} testID="admin-overview">
      {/* Hero */}
      <LinearGradient
        colors={[HEADER_GRAD_A, HEADER_GRAD_B]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <View style={{ flex: 1 }}>
          <Text style={s.heroLabel}>TOTAL USERS</Text>
          <Text style={s.heroValue}>{stats.total_users}</Text>
          <View style={s.heroOnlineRow}>
            <View style={s.onlineDot} />
            <Text style={s.heroOnline}>{stats.online_now} online now</Text>
          </View>
        </View>
        <Ionicons name="people" size={56} color="rgba(255,255,255,0.25)" />
      </LinearGradient>

      {/* Stat grid */}
      <View style={s.grid}>
        {cards.map((c) => (
          <View key={c.label} style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: `${c.color}22` }]}>
              <Ionicons name={c.icon} size={16} color={c.color} />
            </View>
            <Text style={s.statValue}>{c.value}</Text>
            <Text style={s.statLabel}>{c.label}</Text>
          </View>
        ))}
      </View>

      {/* Signup chart */}
      <View style={s.panel}>
        <Text style={s.panelTitle}>Signups · last 7 days</Text>
        <View style={s.chartRow}>
          {signups.map((p) => (
            <View key={p.date} style={s.chartCol}>
              <Text style={s.chartCount}>{p.count}</Text>
              <View style={s.chartBarTrack}>
                <View
                  style={[
                    s.chartBar,
                    { height: `${Math.max(6, (p.count / maxSignup) * 100)}%` },
                  ]}
                />
              </View>
              <Text style={s.chartDay}>{p.date.slice(5)}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ── Users ──
function Users() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [coinEdit, setCoinEdit] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const qs = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
      setRows(await api.get<AdminUserRow[]>(`/admin/users${qs}`));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const patchRow = (id: string, patch: Partial<AdminUserRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const toggleBan = async (u: AdminUserRow) => {
    const res = await api.post<{ banned: boolean }>(`/admin/users/${u.id}/ban`);
    patchRow(u.id, { banned: res.banned });
  };
  const toggleRestrict = async (u: AdminUserRow) => {
    const res = await api.post<{ restricted: boolean }>(`/admin/users/${u.id}/restrict`);
    patchRow(u.id, { restricted: res.restricted });
  };
  const toggleVip = async (u: AdminUserRow) => {
    const res = await api.put<{ is_vip: boolean; vip_tier: string | null }>(
      `/admin/users/${u.id}/vip`,
      { is_vip: !u.is_vip, tier: "lifetime" },
    );
    patchRow(u.id, { is_vip: res.is_vip, vip_tier: res.vip_tier });
  };
  const saveCoins = async (u: AdminUserRow) => {
    const val = parseInt(coinEdit[u.id] ?? "", 10);
    if (isNaN(val) || val < 0) return;
    await api.put(`/admin/users/${u.id}/coins`, { coins: val });
    patchRow(u.id, { coins: val });
    setCoinEdit((prev) => ({ ...prev, [u.id]: "" }));
  };
  const removeUser = (u: AdminUserRow) =>
    confirmAction(`Delete ${u.name} (${u.email}) permanently?`, async () => {
      await api.delete(`/admin/users/${u.id}`);
      setRows((prev) => prev.filter((r) => r.id !== u.id));
    });

  return (
    <View style={{ flex: 1 }} testID="admin-users">
      <View style={s.searchBox}>
        <Ionicons name="search" size={16} color={MUTED} />
        <TextInput
          testID="admin-user-search"
          style={s.searchInput}
          placeholder="Search by name or email…"
          placeholderTextColor={MUTED}
          value={search}
          onChangeText={setSearch}
        />
        <Text style={s.searchCount}>{rows.length}</Text>
      </View>
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={BRAND} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.page}>
          {rows.map((u) => {
            const open = expanded === u.id;
            return (
              <View key={u.id} style={s.card} testID={`admin-user-${u.id}`}>
                <Pressable
                  style={s.userTop}
                  onPress={() => setExpanded(open ? null : u.id)}
                >
                  <View>
                    <Avatar name={u.name} url={u.avatar_url} size={40} />
                    {u.is_online && <View style={s.avatarOnline} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.userNameRow}>
                      <Text style={s.userName} numberOfLines={1}>
                        {u.name}
                      </Text>
                      {u.is_admin && <Chip label="ADMIN" color={BRAND} />}
                      {u.is_vip && <Chip label="VIP" color={GOLD} />}
                      {u.banned && <Chip label="BANNED" color={DANGER} />}
                      {u.restricted && <Chip label="LIMITED" color={ORANGE} />}
                    </View>
                    <Text style={s.userMeta} numberOfLines={1}>
                      {u.email} · {u.country || "—"} · 🪙 {u.coins}
                    </Text>
                  </View>
                  {!u.is_admin && (
                    <Ionicons
                      name={open ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={MUTED}
                    />
                  )}
                </Pressable>
                {open && !u.is_admin && (
                  <View style={s.userActions}>
                    <View style={s.actionsRow}>
                      <ActionBtn
                        testID={`admin-inspect-${u.id}`}
                        label="Inspect"
                        icon="eye"
                        color={BRAND}
                        onPress={() => setInspectId(u.id)}
                      />
                      <ActionBtn
                        testID={`admin-ban-${u.id}`}
                        label={u.banned ? "Unban" : "Ban"}
                        icon="ban"
                        color={DANGER}
                        onPress={() => toggleBan(u)}
                      />
                      <ActionBtn
                        testID={`admin-restrict-${u.id}`}
                        label={u.restricted ? "Unrestrict" : "Restrict"}
                        icon="alert-circle"
                        color={ORANGE}
                        onPress={() => toggleRestrict(u)}
                      />
                      <ActionBtn
                        testID={`admin-vip-${u.id}`}
                        label={u.is_vip ? "Revoke VIP" : "Grant VIP"}
                        icon="diamond"
                        color={GOLD}
                        onPress={() => toggleVip(u)}
                      />
                      <ActionBtn
                        testID={`admin-delete-${u.id}`}
                        label="Delete"
                        icon="trash"
                        color={DANGER}
                        onPress={() => removeUser(u)}
                      />
                    </View>
                    <View style={s.coinRow}>
                      <TextInput
                        testID={`admin-coins-input-${u.id}`}
                        style={s.numInput}
                        placeholder={String(u.coins)}
                        placeholderTextColor={MUTED}
                        keyboardType="numeric"
                        value={coinEdit[u.id] ?? ""}
                        onChangeText={(v) =>
                          setCoinEdit((prev) => ({ ...prev, [u.id]: v }))
                        }
                      />
                      <ActionBtn
                        testID={`admin-coins-save-${u.id}`}
                        label="Set coins"
                        icon="server"
                        color={BRAND}
                        onPress={() => saveCoins(u)}
                      />
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
      {inspectId && (
        <UserInspector userId={inspectId} onClose={() => setInspectId(null)} />
      )}
    </View>
  );
}

// ── Rooms ──
function Rooms() {
  const [rows, setRows] = useState<AdminRoomRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api
      .get<AdminRoomRow[]>("/admin/rooms")
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const endRoom = (r: AdminRoomRow) =>
    confirmAction(`Force-end "${r.title}"?`, async () => {
      await api.post(`/admin/rooms/${r.id}/end`);
      setRows((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, is_live: false } : x)),
      );
    });

  const removeRoom = (r: AdminRoomRow) =>
    confirmAction(`Delete room "${r.title}" permanently?`, async () => {
      await api.delete(`/admin/rooms/${r.id}`);
      setRows((prev) => prev.filter((x) => x.id !== r.id));
    });

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.page} testID="admin-rooms">
      <SectionNote>
        Every voice room, live first. Force-end a live room or delete old ones.
      </SectionNote>
      {rows.length === 0 && <Text style={s.emptyText}>No rooms yet.</Text>}
      {rows.map((r) => (
        <View key={r.id} style={s.card} testID={`admin-room-${r.id}`}>
          <View style={s.userTop}>
            <View
              style={[
                s.roomIcon,
                { backgroundColor: r.is_live ? `${OK}22` : `${MUTED}22` },
              ]}
            >
              <Ionicons name="mic" size={17} color={r.is_live ? OK : MUTED} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.userNameRow}>
                <Text style={s.userName} numberOfLines={1}>
                  {r.title}
                </Text>
                {r.is_live ? (
                  <Chip label="LIVE" color={OK} />
                ) : (
                  <Chip label="ENDED" color={MUTED} />
                )}
                {r.is_private && <Chip label="PRIVATE" color={PURPLE} />}
              </View>
              <Text style={s.userMeta} numberOfLines={1}>
                Host: {r.host_name} · {r.member_count} members ·{" "}
                {(r.language || "").toUpperCase()} {r.topic ? `· ${r.topic}` : ""}
              </Text>
            </View>
          </View>
          <View style={s.actionsRow}>
            {r.is_live && (
              <ActionBtn
                testID={`admin-room-end-${r.id}`}
                label="Force end"
                icon="stop-circle"
                color={ORANGE}
                onPress={() => endRoom(r)}
              />
            )}
            <ActionBtn
              testID={`admin-room-delete-${r.id}`}
              label="Delete"
              icon="trash"
              color={DANGER}
              onPress={() => removeRoom(r)}
            />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Moments ──
function Moments() {
  const [rows, setRows] = useState<AdminMoment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<AdminMoment[]>("/admin/moments")
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  const remove = (m: AdminMoment) =>
    confirmAction("Delete this moment permanently?", async () => {
      await api.delete(`/admin/moments/${m.id}`);
      setRows((prev) => prev.filter((r) => r.id !== m.id));
    });

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.page} testID="admin-moments">
      <SectionNote>Community feed moderation — remove anything unsafe.</SectionNote>
      {rows.length === 0 && <Text style={s.emptyText}>No moments yet.</Text>}
      {rows.map((m) => (
        <View key={m.id} style={s.card} testID={`admin-moment-${m.id}`}>
          <View style={s.userNameRow}>
            <Text style={s.userName}>{m.author_name}</Text>
            {m.has_image && <Chip label="PHOTO" color={BRAND} />}
          </View>
          <Text style={s.userMeta}>{m.author_email}</Text>
          <Text style={s.momentText} numberOfLines={3}>
            {m.text || "(photo only)"}
          </Text>
          <View style={s.momentFoot}>
            <Text style={s.userMeta}>
              ❤️ {m.like_count} · 💬 {m.comment_count}
            </Text>
            <View style={{ flex: 1 }} />
            <ActionBtn
              testID={`admin-moment-delete-${m.id}`}
              label="Delete"
              icon="trash"
              color={DANGER}
              onPress={() => remove(m)}
            />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Market ──
function Market() {
  const [items, setItems] = useState<AdminMarketItem[]>([]);
  const [priceEdit, setPriceEdit] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    api.get<AdminMarketItem[]>("/admin/market").then(setItems).catch(() => {});
  }, []);

  useEffect(load, [load]);

  const save = async (item: AdminMarketItem) => {
    const val = parseInt(priceEdit[item.id] ?? "", 10);
    if (isNaN(val) || val < 0) return;
    await api.put(`/admin/market/${item.id}`, { price: val });
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, price: val } : i)));
    setPriceEdit((prev) => ({ ...prev, [item.id]: "" }));
  };

  const toggleDisabled = async (item: AdminMarketItem) => {
    await api.put(`/admin/market/${item.id}`, { disabled: !item.disabled });
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, disabled: !item.disabled } : i)),
    );
  };

  return (
    <ScrollView contentContainerStyle={s.page} testID="admin-market">
      <SectionNote>
        Store items & pricing — changes apply instantly to all users.
      </SectionNote>
      {items.map((item) => (
        <View key={item.id} style={s.card} testID={`admin-market-${item.id}`}>
          <View style={s.userTop}>
            <View style={s.marketEmoji}>
              <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.userNameRow}>
                <Text style={s.userName}>{item.name}</Text>
                <Chip label={item.type.toUpperCase()} color={PURPLE} />
                {item.disabled && <Chip label="DISABLED" color={DANGER} />}
              </View>
              <Text style={s.userMeta}>
                🪙 {item.price} (default {item.default_price})
              </Text>
            </View>
          </View>
          <View style={s.coinRow}>
            <TextInput
              testID={`admin-price-input-${item.id}`}
              style={s.numInput}
              placeholder={String(item.price)}
              placeholderTextColor={MUTED}
              keyboardType="numeric"
              value={priceEdit[item.id] ?? ""}
              onChangeText={(v) =>
                setPriceEdit((prev) => ({ ...prev, [item.id]: v }))
              }
            />
            <ActionBtn
              testID={`admin-price-save-${item.id}`}
              label="Set price"
              color={BRAND}
              onPress={() => save(item)}
            />
            <ActionBtn
              testID={`admin-market-toggle-${item.id}`}
              label={item.disabled ? "Enable" : "Disable"}
              color={item.disabled ? OK : DANGER}
              onPress={() => toggleDisabled(item)}
            />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Broadcast ──
function Broadcast() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<number | null>(null);

  const send = () => {
    if (!title.trim() || !message.trim() || busy) return;
    confirmAction(
      "Send this announcement to EVERY user (in-app + push)?",
      async () => {
        setBusy(true);
        setSentTo(null);
        try {
          const res = await api.post<{ sent: number }>("/admin/broadcast", {
            title: title.trim(),
            message: message.trim(),
          });
          setSentTo(res.sent);
          setTitle("");
          setMessage("");
        } catch (e) {
          Alert.alert(
            "Broadcast",
            e instanceof Error ? e.message : "Could not send. Try again.",
          );
        } finally {
          setBusy(false);
        }
      },
    );
  };

  return (
    <ScrollView contentContainerStyle={s.page} testID="admin-broadcast">
      <View style={s.panel}>
        <View style={s.broadcastHead}>
          <View style={[s.statIcon, { backgroundColor: `${PURPLE}22` }]}>
            <Ionicons name="megaphone" size={16} color={PURPLE} />
          </View>
          <Text style={s.panelTitle}>Announcement to all users</Text>
        </View>
        <SectionNote>
          Delivered to every user&apos;s Notifications feed instantly, plus a
          push notification on their devices (best effort).
        </SectionNote>
        <Text style={s.fieldLabel}>Title</Text>
        <TextInput
          testID="admin-broadcast-title"
          style={s.bigInput}
          placeholder="e.g. New feature: Voice Rooms 2.0 🎉"
          placeholderTextColor={MUTED}
          value={title}
          onChangeText={setTitle}
          maxLength={80}
        />
        <Text style={s.fieldLabel}>Message</Text>
        <TextInput
          testID="admin-broadcast-message"
          style={[s.bigInput, s.bigTextarea]}
          placeholder="Write the announcement…"
          placeholderTextColor={MUTED}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
        />
        <Pressable
          testID="admin-broadcast-send"
          style={({ pressed }) => [
            s.primaryBtn,
            (!title.trim() || !message.trim()) && { opacity: 0.5 },
            pressed && { opacity: 0.8 },
          ]}
          onPress={send}
          disabled={busy || !title.trim() || !message.trim()}
        >
          {busy ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="send" size={15} color="#FFF" />
              <Text style={s.primaryBtnText}>Send to all users</Text>
            </>
          )}
        </Pressable>
        {sentTo !== null && (
          <View style={s.sentBanner} testID="admin-broadcast-sent">
            <Ionicons name="checkmark-circle" size={16} color={OK} />
            <Text style={s.sentText}>Sent to {sentTo} users</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ── Integrations ──
function Integrations() {
  const [files, setFiles] = useState<IntegrationFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<IntegrationFile[]>("/admin/integration-files")
      .then(setFiles)
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const upload = async (file: IntegrationFile) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/json", "*/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setBusyId(file.id);
    try {
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const updated = await api.post<IntegrationFile>(
        `/admin/integration-files/${file.id}`,
        { content_base64: base64 },
      );
      setFiles((prev) => prev.map((f) => (f.id === file.id ? updated : f)));
      Alert.alert(
        "Uploaded",
        "Saved. Click Publish (top right) and generate a new build for this to take effect on real devices.",
      );
    } catch (e) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = (file: IntegrationFile) =>
    confirmAction(`Remove ${file.label}?`, async () => {
      const updated = await api.delete<IntegrationFile>(
        `/admin/integration-files/${file.id}`,
      );
      setFiles((prev) => prev.map((f) => (f.id === file.id ? updated : f)));
    });

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.page} testID="admin-integrations">
      <SectionNote>
        Upload the config files 3rd-party integrations need — no code change
        required. After uploading, Publish and generate a new build for native
        changes to take effect.
      </SectionNote>
      {files.map((f) => (
        <View key={f.id} style={s.card} testID={`admin-integration-${f.id}`}>
          <View style={s.userTop}>
            <Ionicons
              name={f.exists ? "checkmark-circle" : "alert-circle"}
              size={20}
              color={f.exists ? OK : GOLD}
            />
            <View style={{ flex: 1 }}>
              <Text style={s.userName}>{f.label}</Text>
              <Text style={s.userMeta}>
                {f.exists
                  ? `Configured${
                      f.updated_at
                        ? " · updated " + new Date(f.updated_at).toLocaleString()
                        : ""
                    }`
                  : "Not uploaded yet"}
              </Text>
            </View>
          </View>
          <Text style={s.momentText}>{f.description}</Text>
          <View style={s.actionsRow}>
            <ActionBtn
              testID={`admin-integration-upload-${f.id}`}
              label={
                busyId === f.id
                  ? "Uploading…"
                  : f.exists
                    ? "Replace file"
                    : "Upload file"
              }
              icon="cloud-upload"
              color={BRAND}
              onPress={() => upload(f)}
            />
            {f.exists && (
              <ActionBtn
                testID={`admin-integration-remove-${f.id}`}
                label="Remove"
                icon="trash"
                color={DANGER}
                onPress={() => remove(f)}
              />
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Settings ──
// ── Audit log — security trail of admin actions ──
interface AuditRow {
  id: string;
  admin_name: string | null;
  action: string;
  target: string | null;
  detail: string | null;
  created_at: string;
}

const AUDIT_ACTION_COLORS: Record<string, string> = {
  ban_user: DANGER,
  unban_user: OK,
  restrict_user: ORANGE,
  unrestrict_user: OK,
  delete_user: DANGER,
  delete_room: DANGER,
  delete_moment: DANGER,
  force_end_room: ORANGE,
  broadcast: PURPLE,
  set_coins: GOLD,
  set_vip: GOLD,
  remove_vip: GOLD,
  update_config: BRAND,
  update_market_item: BRAND,
  revoke_admin_sessions: DANGER,
};

function AuditLog({ onRevoked }: { onRevoked: () => void }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.get<AuditRow[]>("/admin/audit?limit=100");
      setRows(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const revokeAll = () => {
    confirmAction(
      "Revoke ALL admin sessions? Every admin (including you) must sign in again.",
      async () => {
        try {
          await api.post("/admin/security/revoke-sessions");
        } catch {
          // token already invalid — proceed to logout anyway
        }
        onRevoked();
      },
    );
  };

  return (
    <ScrollView contentContainerStyle={s.page} testID="admin-audit">
      <View style={s.panel}>
        <View style={s.broadcastHead}>
          <View style={[s.statIcon, { backgroundColor: `${DANGER}22` }]}>
            <Ionicons name="shield-checkmark" size={16} color={DANGER} />
          </View>
          <Text style={s.panelTitle}>Session security</Text>
        </View>
        <SectionNote>
          Admin sessions auto-expire after 60 minutes. Revoking rotates the
          session version so every issued admin token stops working instantly.
        </SectionNote>
        <Pressable
          testID="admin-revoke-sessions"
          style={({ pressed }) => [
            s.primaryBtn,
            { backgroundColor: DANGER },
            pressed && { opacity: 0.8 },
          ]}
          onPress={revokeAll}
        >
          <Ionicons name="log-out-outline" size={15} color="#FFF" />
          <Text style={s.primaryBtnText}>Revoke all admin sessions</Text>
        </Pressable>
      </View>

      <View style={s.panel}>
        <View style={s.broadcastHead}>
          <View style={[s.statIcon, { backgroundColor: `${BRAND}22` }]}>
            <Ionicons name="receipt-outline" size={16} color={BRAND} />
          </View>
          <Text style={s.panelTitle}>Audit trail</Text>
        </View>
        <SectionNote>
          Every mutating admin action is recorded — who did what, and when.
        </SectionNote>
        {loading ? (
          <ActivityIndicator color={BRAND} style={{ marginVertical: 20 }} />
        ) : rows.length === 0 ? (
          <Text style={[s.sectionNote, { textAlign: "center", paddingVertical: 16 }]}>
            No admin actions recorded yet.
          </Text>
        ) : (
          rows.map((r) => {
            const color = AUDIT_ACTION_COLORS[r.action] || MUTED;
            return (
              <View
                key={r.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: BORDER,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: color,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: TEXT, fontSize: 13, fontWeight: "700" }}>
                    {r.action.replace(/_/g, " ")}
                    {r.detail ? (
                      <Text style={{ color: MUTED, fontWeight: "400" }}>
                        {"  ·  "}
                        {r.detail}
                      </Text>
                    ) : null}
                  </Text>
                  <Text style={{ color: MUTED, fontSize: 11, marginTop: 1 }}>
                    {r.admin_name || "Admin"}
                    {r.target ? ` → ${r.target.slice(0, 8)}…` : ""}
                    {"  ·  "}
                    {new Date(r.created_at).toLocaleString()}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

function Settings() {
  const [cfg, setCfg] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<Record<string, number | string>>("/admin/config").then((d) => {
      setCfg(Object.fromEntries(Object.entries(d).map(([k, v]) => [k, String(v)])));
      setLoaded(true);
    });
  }, []);

  const FIELDS: [string, string][] = [
    ["free_translations_per_day", "Free translations / day"],
    ["free_new_chats_per_day", "Free new chats / day"],
    ["vip_new_chats_per_day", "VIP new chats / day"],
  ];

  const save = async () => {
    const body: Record<string, number> = {};
    for (const [key] of FIELDS) {
      const v = parseInt(cfg[key] ?? "", 10);
      if (!isNaN(v) && v >= 0) body[key] = v;
    }
    await api.put("/admin/config", body);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!loaded) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.page} testID="admin-settings">
      <SectionNote>
        App-wide limits — changes apply instantly to all users.
      </SectionNote>
      <View style={s.panel}>
        {FIELDS.map(([key, label]) => (
          <View key={key} style={s.settingField}>
            <Text style={s.settingLabel}>{label}</Text>
            <TextInput
              testID={`admin-cfg-${key}`}
              style={s.numInput}
              keyboardType="numeric"
              value={cfg[key] ?? ""}
              onChangeText={(v) => setCfg((prev) => ({ ...prev, [key]: v }))}
              placeholderTextColor={MUTED}
            />
          </View>
        ))}
        <Pressable testID="admin-cfg-save" style={s.primaryBtn} onPress={save}>
          <Text style={s.primaryBtnText}>{saved ? "Saved ✓" : "Save settings"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// ── Pro sub-app: Overview ──
interface ProAdminStats {
  tutors: number;
  online_tutors: number;
  students: number;
  total_sessions: number;
  active_sessions: number;
  completed_sessions: number;
  minutes_taught: number;
}

function ProHome() {
  const [stats, setStats] = useState<ProAdminStats | null>(null);
  useEffect(() => {
    api.get<ProAdminStats>("/admin/pro/stats").then(setStats).catch(() => {});
  }, []);
  if (!stats) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }
  const cards: { label: string; value: number; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
    { label: "Tutors", value: stats.tutors, icon: "school", color: ORANGE },
    { label: "Online now", value: stats.online_tutors, icon: "ellipse", color: OK },
    { label: "Learners", value: stats.students, icon: "people", color: BRAND },
    { label: "Sessions", value: stats.total_sessions, icon: "videocam", color: PURPLE },
    { label: "Active calls", value: stats.active_sessions, icon: "radio", color: DANGER },
    { label: "Completed", value: stats.completed_sessions, icon: "checkmark-done", color: OK },
    { label: "Minutes taught", value: stats.minutes_taught, icon: "time", color: GOLD },
  ];
  return (
    <ScrollView contentContainerStyle={s.page} testID="admin-pro-overview">
      <LinearGradient
        colors={["#FB923C", "#C05A46"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <View style={{ flex: 1 }}>
          <Text style={s.heroLabel}>PRO · LIVE TUTORING</Text>
          <Text style={s.heroValue}>{stats.tutors}</Text>
          <View style={s.heroOnlineRow}>
            <View style={s.onlineDot} />
            <Text style={s.heroOnline}>{stats.online_tutors} tutors online</Text>
          </View>
        </View>
        <Ionicons name="videocam" size={56} color="rgba(255,255,255,0.25)" />
      </LinearGradient>
      <View style={s.grid}>
        {cards.map((c) => (
          <View key={c.label} style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: `${c.color}22` }]}>
              <Ionicons name={c.icon} size={16} color={c.color} />
            </View>
            <Text style={s.statValue}>{c.value}</Text>
            <Text style={s.statLabel}>{c.label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ── Pro sub-app: Tutors ──
interface ProTutorRow {
  id: string;
  name: string;
  avatar_url?: string;
  native_accent?: string;
  specialties: string[];
  teaches: string[];
  rating: number;
  is_online: boolean;
  featured: boolean;
  hourly_rate: number;
  lessons_taught: number;
}

function ProTutors() {
  const [tutors, setTutors] = useState<ProTutorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    native_accent: "",
    teaches: "en",
    specialties: "",
    hourly_rate: "15",
    avatar_url: "",
  });

  const load = useCallback(() => {
    api
      .get<ProTutorRow[]>("/admin/pro/tutors")
      .then(setTutors)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => load(), [load]);

  const patch = async (id: string, body: Record<string, unknown>) => {
    try {
      const updated = await api.put<ProTutorRow>(`/admin/pro/tutors/${id}`, body);
      setTutors((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {
      // silent
    }
  };

  const remove = (id: string) =>
    confirmAction("Delete this tutor permanently?", async () => {
      try {
        await api.delete(`/admin/pro/tutors/${id}`);
        setTutors((prev) => prev.filter((t) => t.id !== id));
      } catch {
        // silent
      }
    });

  const create = async () => {
    if (!form.name.trim()) return;
    try {
      const body = {
        name: form.name.trim(),
        native_accent: form.native_accent.trim() || null,
        teaches: form.teaches.split(",").map((x) => x.trim()).filter(Boolean),
        specialties: form.specialties.split(",").map((x) => x.trim()).filter(Boolean),
        hourly_rate: parseFloat(form.hourly_rate) || 15,
        avatar_url: form.avatar_url.trim() || null,
      };
      const created = await api.post<ProTutorRow>("/admin/pro/tutors", body);
      setTutors((prev) => [created, ...prev]);
      setForm({ name: "", native_accent: "", teaches: "en", specialties: "", hourly_rate: "15", avatar_url: "" });
      setShowAdd(false);
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.page} testID="admin-pro-tutors">
      <Pressable
        testID="admin-pro-add-tutor"
        style={s.primaryBtn}
        onPress={() => setShowAdd((v) => !v)}
      >
        <Text style={s.primaryBtnText}>
          {showAdd ? "Close" : "+ Add tutor"}
        </Text>
      </Pressable>

      {showAdd && (
        <View style={s.panel}>
          {[
            ["name", "Name"],
            ["native_accent", "Accent (e.g. British · RP)"],
            ["teaches", "Teaches (codes, comma sep: en,es)"],
            ["specialties", "Specialties (comma sep)"],
            ["hourly_rate", "Minutes per lesson"],
            ["avatar_url", "Avatar URL"],
          ].map(([key, label]) => (
            <View key={key} style={s.settingField}>
              <Text style={s.settingLabel}>{label}</Text>
              <TextInput
                testID={`admin-pro-form-${key}`}
                style={[s.numInput, { minWidth: 170 }]}
                value={(form as Record<string, string>)[key]}
                onChangeText={(v) => setForm((p) => ({ ...p, [key]: v }))}
                placeholderTextColor={MUTED}
                autoCapitalize="none"
              />
            </View>
          ))}
          <Pressable testID="admin-pro-create-tutor" style={s.primaryBtn} onPress={create}>
            <Text style={s.primaryBtnText}>Create tutor</Text>
          </Pressable>
        </View>
      )}

      {tutors.map((t) => (
        <View key={t.id} style={s.panel} testID={`admin-pro-tutor-${t.id}`}>
          <View style={s.rowHead}>
            <Avatar name={t.name} url={t.avatar_url} size={44} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <Text style={s.rowTitle}>{t.name}</Text>
                {t.featured && <Chip label="Featured" color={GOLD} />}
                <Chip label={t.is_online ? "Online" : "Offline"} color={t.is_online ? OK : MUTED} />
              </View>
              <Text style={s.rowSub}>
                {t.native_accent} · ⭐ {t.rating.toFixed(1)} · {t.lessons_taught} lessons
              </Text>
              <Text style={s.rowSub}>{(t.specialties || []).join(" · ")}</Text>
            </View>
          </View>
          <View style={s.actionRow}>
            <ActionBtn
              testID={`admin-pro-toggle-online-${t.id}`}
              label={t.is_online ? "Set offline" : "Set online"}
              color={t.is_online ? MUTED : OK}
              icon="ellipse"
              onPress={() => patch(t.id, { is_online: !t.is_online })}
            />
            <ActionBtn
              testID={`admin-pro-toggle-featured-${t.id}`}
              label={t.featured ? "Unfeature" : "Feature"}
              color={GOLD}
              icon="star"
              onPress={() => patch(t.id, { featured: !t.featured })}
            />
            <ActionBtn
              label="+ Rating"
              color={BRAND}
              icon="trending-up"
              onPress={() => patch(t.id, { rating: Math.min(5, Math.round((t.rating + 0.1) * 10) / 10) })}
            />
            <ActionBtn
              testID={`admin-pro-delete-${t.id}`}
              label="Delete"
              color={DANGER}
              icon="trash"
              onPress={() => remove(t.id)}
            />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Pro sub-app: Sessions ──
interface ProSessionRow {
  id: string;
  status: string;
  student?: { name?: string };
  tutor?: { name?: string };
  call_duration: number;
  created_at?: string;
}

function ProSessions() {
  const [sessions, setSessions] = useState<ProSessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api
      .get<ProSessionRow[]>("/admin/pro/sessions")
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => load(), [load]);

  const forceEnd = (id: string) =>
    confirmAction("Force-end this session?", async () => {
      try {
        await api.post(`/admin/pro/sessions/${id}/end`);
        load();
      } catch {
        // silent
      }
    });

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.page} testID="admin-pro-sessions">
      <SectionNote>All lessons across the Pro app — newest first.</SectionNote>
      {sessions.length === 0 && <Text style={s.rowSub}>No sessions yet.</Text>}
      {sessions.map((se) => (
        <View key={se.id} style={s.panel} testID={`admin-pro-session-${se.id}`}>
          <View style={s.rowHead}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={s.rowTitle}>
                  {se.student?.name || "Learner"} → {se.tutor?.name || "Tutor"}
                </Text>
                <Chip
                  label={se.status}
                  color={se.status === "active" ? DANGER : se.status === "completed" ? OK : MUTED}
                />
              </View>
              <Text style={s.rowSub}>
                {Math.round((se.call_duration || 0) / 60)} min ·{" "}
                {(se.created_at || "").slice(0, 16).replace("T", " ")}
              </Text>
            </View>
            {se.status === "active" && (
              <ActionBtn
                testID={`admin-pro-endsession-${se.id}`}
                label="End"
                color={DANGER}
                icon="stop-circle"
                onPress={() => forceEnd(se.id)}
              />
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Premium sub-app: VIP membership control ──
interface PremiumStats {
  vip_users: number;
  vip_weekly: number;
  vip_monthly: number;
  vip_lifetime: number;
}

function PremiumHome() {
  const [stats, setStats] = useState<PremiumStats | null>(null);
  const [members, setMembers] = useState<AdminUserRow[]>([]);

  const load = useCallback(() => {
    api.get<PremiumStats>("/admin/premium/stats").then(setStats).catch(() => {});
    api.get<AdminUserRow[]>("/admin/premium/members").then(setMembers).catch(() => {});
  }, []);
  useEffect(() => load(), [load]);

  const revoke = (id: string) =>
    confirmAction("Revoke Premium (VIP) for this member?", async () => {
      try {
        await api.put(`/admin/users/${id}/vip`, { is_vip: false });
        setMembers((prev) => prev.filter((m) => m.id !== id));
        api.get<PremiumStats>("/admin/premium/stats").then(setStats).catch(() => {});
      } catch {
        // silent
      }
    });

  if (!stats) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }
  const cards: { label: string; value: number; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
    { label: "Members", value: stats.vip_users, icon: "diamond", color: GOLD },
    { label: "Weekly", value: stats.vip_weekly, icon: "calendar", color: BRAND },
    { label: "Monthly", value: stats.vip_monthly, icon: "calendar-clear", color: PURPLE },
    { label: "Lifetime", value: stats.vip_lifetime, icon: "infinite", color: OK },
  ];

  return (
    <ScrollView contentContainerStyle={s.page} testID="admin-premium-overview">
      <LinearGradient
        colors={["#FBBF24", "#B45309"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <View style={{ flex: 1 }}>
          <Text style={s.heroLabel}>PREMIUM · VIP CLUB</Text>
          <Text style={s.heroValue}>{stats.vip_users}</Text>
          <Text style={s.heroOnline}>active members</Text>
        </View>
        <Ionicons name="diamond" size={52} color="rgba(255,255,255,0.3)" />
      </LinearGradient>
      <View style={s.grid}>
        {cards.map((c) => (
          <View key={c.label} style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: `${c.color}22` }]}>
              <Ionicons name={c.icon} size={16} color={c.color} />
            </View>
            <Text style={s.statValue}>{c.value}</Text>
            <Text style={s.statLabel}>{c.label}</Text>
          </View>
        ))}
      </View>
      <SectionNote>
        Premium shares the main app but with a VIP theme. Manage who has access
        here (grant VIP from the Main · Users tab).
      </SectionNote>
      {members.map((m) => (
        <View key={m.id} style={s.panel} testID={`admin-premium-member-${m.id}`}>
          <View style={s.rowHead}>
            <Avatar name={m.name} url={m.avatar_url} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>{m.name}</Text>
              <Text style={s.rowSub}>
                {m.email} · {m.vip_tier || "lifetime"}
              </Text>
            </View>
            <ActionBtn
              testID={`admin-premium-revoke-${m.id}`}
              label="Revoke"
              color={DANGER}
              icon="close-circle"
              onPress={() => revoke(m.id)}
            />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}


// ── Styles ──
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  // Login
  loginWrap: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  loginCard: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  loginIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  loginTitle: {
    color: TEXT,
    fontSize: 22,
    fontWeight: "800",
  },
  loginSub: {
    color: MUTED,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 4,
  },
  loginField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "stretch",
    backgroundColor: CARD_2,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  loginInput: {
    flex: 1,
    paddingVertical: 12,
    color: TEXT,
    fontSize: 14,
    ...Platform.select({ web: { outlineStyle: "none" } as object, default: {} }),
  },
  error: {
    color: DANGER,
    fontSize: 13,
    alignSelf: "flex-start",
  },
  primaryBtn: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 4,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  // Top-level header (purple gradient, reference-inspired)
  header: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerEyebrow: {
    color: "rgba(255,255,255,0.75)",
    fontFamily: fonts.textBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontFamily: fonts.displayBold,
    fontSize: 22,
    marginTop: 2,
  },
  headerSub: {
    color: "rgba(255,255,255,0.75)",
    fontFamily: fonts.text,
    fontSize: 12,
    marginTop: 2,
  },
  headerIconRow: {
    flexDirection: "row",
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  appPillRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 14,
  },
  appPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  appPillActive: {
    backgroundColor: "#FFFFFF",
  },
  appPillText: {
    color: "rgba(255,255,255,0.9)",
    fontFamily: fonts.textBold,
    fontSize: 12.5,
  },
  appPillTextActive: {
    color: BRAND,
  },
  // Floating dark bottom nav (reference-inspired)
  bottomNavWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 18,
    alignItems: "center",
  },
  bottomNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: NAV_BG,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.18)",
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnActive: {
    backgroundColor: "#FFFFFF",
  },
  // "More" sheet
  moreBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.42)",
  },
  moreSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: CARD,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 34,
  },
  moreHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D4DB",
    alignSelf: "center",
    marginBottom: 12,
  },
  moreTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: TEXT,
    marginBottom: 14,
  },
  moreGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  moreItem: {
    width: "31%",
    flexGrow: 1,
    backgroundColor: CARD_2,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 8,
  },
  moreItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  moreItemText: {
    fontFamily: fonts.textBold,
    fontSize: 12.5,
    color: TEXT,
  },
  // Legacy top-bar (kept for potential fallback, unused after redesign) —
  // scoped so any lingering reference still lays out cleanly.
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  topLogo: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "800",
  },
  topSub: {
    color: MUTED,
    fontSize: 11,
  },
  logoutBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${DANGER}55`,
    backgroundColor: `${DANGER}14`,
    alignItems: "center",
    justifyContent: "center",
  },
  // Tabs (kept for legacy sub-components that reference these keys)
  tabBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  tabBtnActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  tabText: {
    color: MUTED,
    fontSize: 12.5,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  // App switcher (legacy)
  appSwitcher: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  appBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: CARD,
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  appBtnText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "800",
  },
  // Generic list rows (Pro/Premium)
  rowHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "800",
  },
  rowSub: {
    color: MUTED,
    fontSize: 12.5,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  // Layout
  page: {
    padding: 14,
    gap: 12,
    paddingBottom: 110, // room for the floating bottom nav
  },
  panel: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  panelTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "800",
  },
  sectionNote: {
    color: MUTED,
    fontSize: 12.5,
    lineHeight: 18,
  },
  emptyText: {
    color: MUTED,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 24,
  },
  // Hero + stats
  hero: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 18,
  },
  heroLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  heroValue: {
    color: "#FFFFFF",
    fontSize: 40,
    fontWeight: "800",
    marginVertical: 2,
  },
  heroOnlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ADE80",
  },
  heroOnline: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    color: TEXT,
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    color: MUTED,
    fontSize: 12,
  },
  // Chart
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    height: 140,
    paddingTop: 6,
  },
  chartCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    height: "100%",
  },
  chartCount: {
    color: MUTED,
    fontSize: 10.5,
    fontWeight: "700",
  },
  chartBarTrack: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
  },
  chartBar: {
    width: "100%",
    borderRadius: 6,
    backgroundColor: BRAND,
    minHeight: 4,
  },
  chartDay: {
    color: MUTED,
    fontSize: 9.5,
  },
  // Cards / rows
  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  userTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarOnline: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: OK,
    borderWidth: 2,
    borderColor: CARD,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  userName: {
    color: TEXT,
    fontSize: 14.5,
    fontWeight: "700",
    flexShrink: 1,
  },
  userMeta: {
    color: MUTED,
    fontSize: 12,
    marginTop: 1,
  },
  userActions: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 10,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  coinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  numInput: {
    minWidth: 90,
    backgroundColor: CARD_2,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
    color: TEXT,
    fontSize: 13,
    ...Platform.select({ web: { outlineStyle: "none" } as object, default: {} }),
  },
  // Search
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 14,
    marginTop: 4,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: TEXT,
    fontSize: 13.5,
    ...Platform.select({ web: { outlineStyle: "none" } as object, default: {} }),
  },
  searchCount: {
    color: MUTED,
    fontSize: 11.5,
    fontWeight: "700",
  },
  // Chips
  chip: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  chipText: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  // Rooms
  roomIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  // Moments
  momentText: {
    color: TEXT,
    fontSize: 13,
    lineHeight: 19,
  },
  momentFoot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  // Market
  marketEmoji: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: CARD_2,
    alignItems: "center",
    justifyContent: "center",
  },
  // Broadcast
  broadcastHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fieldLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  bigInput: {
    backgroundColor: CARD_2,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: TEXT,
    fontSize: 14,
    ...Platform.select({ web: { outlineStyle: "none" } as object, default: {} }),
  },
  bigTextarea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  sentBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: `${OK}15`,
    borderWidth: 1,
    borderColor: `${OK}44`,
    borderRadius: 10,
    padding: 10,
  },
  sentText: {
    color: OK,
    fontSize: 13,
    fontWeight: "700",
  },
  // Settings
  settingField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  settingLabel: {
    color: TEXT,
    fontSize: 13.5,
    flex: 1,
  },
});


/* ------------------------------------------------------------------ */
/* Deep user inspector: profile · activity · conversations · messages  */
/* ------------------------------------------------------------------ */
function UserInspector({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [convId, setConvId] = useState<string | null>(null);
  const [convTitle, setConvTitle] = useState("");
  const [msgs, setMsgs] = useState<any[] | null>(null);

  useEffect(() => {
    api.get<any>(`/admin/users/${userId}/inspect`).then(setData).catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!convId) return;
    setMsgs(null);
    api
      .get<any[]>(`/admin/conversations/${convId}/messages`)
      .then(setMsgs)
      .catch(() => setMsgs([]));
  }, [convId]);

  const Stat = ({ label, value }: { label: string; value: any }) => (
    <View style={{ backgroundColor: CARD, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center", flexGrow: 1 }}>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: TEXT }}>{value}</Text>
      <Text style={{ fontFamily: fonts.text, fontSize: 11.5, color: MUTED }}>{label}</Text>
    </View>
  );

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={["top", "bottom"]}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: 14, gap: 10 }}>
          <Pressable testID="inspector-close" onPress={convId ? () => setConvId(null) : onClose} hitSlop={10}>
            <Ionicons name={convId ? "chevron-back" : "close"} size={25} color={TEXT} />
          </Pressable>
          <Text style={{ flex: 1, fontFamily: fonts.displayBold, fontSize: 16.5, color: TEXT }} numberOfLines={1}>
            {convId ? convTitle : data?.user?.name || "User"}
          </Text>
        </View>

        {!data ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={BRAND} />
          </View>
        ) : convId ? (
          /* Transcript */
          !msgs ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={BRAND} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 14, gap: 8 }} testID="inspector-transcript">
              {msgs.map((m) => {
                const mine = m.sender_id === userId;
                return (
                  <View key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%" }}>
                    <Text style={{ fontFamily: fonts.text, fontSize: 10.5, color: MUTED, textAlign: mine ? "right" : "left" }}>
                      {m.sender_name} · {new Date(m.created_at).toLocaleString()}
                    </Text>
                    <View style={{ backgroundColor: mine ? BRAND : CARD_2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginTop: 2 }}>
                      <Text style={{ fontFamily: fonts.text, fontSize: 13.5, color: mine ? "#06263B" : TEXT }}>
                        {m.recalled
                          ? "⊘ recalled"
                          : m.type === "voice"
                            ? "🎤 Voice message"
                            : m.type === "image"
                              ? "📷 Photo"
                              : m.type === "sticker"
                                ? "😀 Sticker"
                                : m.type === "call"
                                  ? "📞 Call"
                                  : m.text || `(${m.type})`}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )
        ) : (
          /* Profile + activity + conversations */
          <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }} testID="inspector-body">
            <View style={[s.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
              <Avatar name={data.user.name} url={data.user.avatar_url} size={54} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: TEXT }}>{data.user.name}</Text>
                <Text style={{ fontFamily: fonts.text, fontSize: 12.5, color: MUTED }}>{data.user.email}</Text>
                <Text style={{ fontFamily: fonts.text, fontSize: 12, color: MUTED, marginTop: 2 }}>
                  {data.user.country || "—"} · 🪙 {data.user.coins} · 💎 {data.user.diamonds} · 🔥 {data.user.streak_count}
                </Text>
                <Text style={{ fontFamily: fonts.text, fontSize: 11.5, color: MUTED, marginTop: 2 }}>
                  Joined {data.user.created_at ? new Date(data.user.created_at).toLocaleDateString() : "—"} · Last active{" "}
                  {data.user.last_active ? new Date(data.user.last_active).toLocaleString() : "—"}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <Stat label="Moments" value={data.stats.moments} />
              <Stat label="Rooms" value={data.stats.rooms_hosted} />
              <Stat label="Gifts" value={data.stats.gifts_received} />
              <Stat label="Chats" value={data.stats.conversations} />
              <Stat label="Orders" value={data.stats.orders} />
            </View>

            <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: TEXT, marginTop: 6 }}>Conversations — tap to read</Text>
            {data.conversations.length === 0 && <SectionNote>No conversations yet.</SectionNote>}
            {data.conversations.map((c: any) => (
              <Pressable
                key={c.id}
                testID={`inspector-conv-${c.id}`}
                style={[s.card, { flexDirection: "row", alignItems: "center", gap: 10 }]}
                onPress={() => {
                  setConvTitle(c.title);
                  setConvId(c.id);
                }}
              >
                <Ionicons name={c.is_group ? "people" : "chatbubble"} size={17} color={BRAND} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.textBold, fontSize: 14, color: TEXT }} numberOfLines={1}>
                    {c.title} {c.is_group ? `(${c.member_count})` : ""}
                  </Text>
                  <Text style={{ fontFamily: fonts.text, fontSize: 12, color: MUTED }} numberOfLines={1}>
                    {c.last_message || "…"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color={MUTED} />
              </Pressable>
            ))}

            <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: TEXT, marginTop: 6 }}>Recent moments</Text>
            {data.recent_moments.length === 0 && <SectionNote>No moments yet.</SectionNote>}
            {data.recent_moments.map((m: any) => (
              <View key={m.id} style={s.card}>
                <Text style={{ fontFamily: fonts.text, fontSize: 13.5, color: TEXT }} numberOfLines={2}>
                  {m.text || "(media post)"}
                </Text>
                <Text style={{ fontFamily: fonts.text, fontSize: 11.5, color: MUTED, marginTop: 3 }}>
                  ❤ {m.likes} · {new Date(m.created_at).toLocaleString()}
                </Text>
              </View>
            ))}

            <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: TEXT, marginTop: 6 }}>Store orders</Text>
            {data.orders.length === 0 && <SectionNote>No orders.</SectionNote>}
            {data.orders.map((o: any) => (
              <View key={o.id} style={[s.card, { flexDirection: "row", alignItems: "center" }]}>
                <Text style={{ flex: 1, fontFamily: fonts.textSemi, fontSize: 13.5, color: TEXT }}>
                  #{o.id.slice(0, 8)} · ${o.total}
                </Text>
                <Chip label={(o.status || "pending").toUpperCase()} color={o.status === "delivered" ? "#22C55E" : ORANGE} />
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Store orders management                                             */
/* ------------------------------------------------------------------ */
const ORDER_FLOW = ["pending", "shipped", "delivered", "cancelled"];

function Orders() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setRows(await api.get<any[]>("/admin/orders"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cycle = async (o: any) => {
    const next = ORDER_FLOW[(ORDER_FLOW.indexOf(o.status) + 1) % ORDER_FLOW.length];
    await api.put(`/admin/orders/${o.id}`, { status: next });
    setRows((prev) => prev.map((r) => (r.id === o.id ? { ...r, status: next } : r)));
  };

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );

  return (
    <ScrollView contentContainerStyle={s.page} testID="admin-orders">
      <SectionNote>Tap a status chip to advance it (pending → shipped → delivered → cancelled).</SectionNote>
      {rows.length === 0 && <SectionNote>No orders yet.</SectionNote>}
      {rows.map((o) => (
        <View key={o.id} style={s.card} testID={`admin-order-${o.id}`}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ flex: 1, fontFamily: fonts.textBold, fontSize: 14.5, color: TEXT }}>
              #{o.id.slice(0, 8)} · {o.user_name}
            </Text>
            <Pressable testID={`admin-order-status-${o.id}`} onPress={() => cycle(o)}>
              <Chip
                label={(o.status || "pending").toUpperCase()}
                color={o.status === "delivered" ? "#22C55E" : o.status === "cancelled" ? DANGER : o.status === "shipped" ? BRAND : ORANGE}
              />
            </Pressable>
          </View>
          {o.items.map((it: any, i: number) => (
            <Text key={i} style={{ fontFamily: fonts.text, fontSize: 12.5, color: MUTED, marginTop: 3 }} numberOfLines={1}>
              {it.qty}× {it.name} {it.size ? `(${it.size})` : ""} — ${it.price}
            </Text>
          ))}
          <Text style={{ fontFamily: fonts.textBold, fontSize: 13.5, color: TEXT, marginTop: 5 }}>
            Total ${o.total} · {o.payment || "COD"}
          </Text>
          <Text style={{ fontFamily: fonts.text, fontSize: 12, color: MUTED, marginTop: 2 }}>
            📦 {o.name} · {o.phone}
          </Text>
          <Text style={{ fontFamily: fonts.text, fontSize: 12, color: MUTED }} numberOfLines={2}>
            {o.address}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
