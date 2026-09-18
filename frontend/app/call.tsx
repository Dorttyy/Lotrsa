import React, { useMemo, useState } from "react";
import { ActivityIndicator, LayoutAnimation, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, ThemeColors } from "@/src/theme";
import { AppTitle } from "@/src/ui/AppTitle";
import { Ionicons } from "@/src/ui/icons";
import { ProfileAvatar } from "@/src/components/ProfileAvatar";
import { VipBadge } from "@/src/components/Badges";
import { LANGUAGES, langName } from "@/src/constants/languages";
import { RandomPartner } from "@/src/components/call/RandomPartner";
import { usePracticeCalls } from "@/src/hooks/use-practice-calls";
import { CallFilterSheet } from "@/src/components/call/CallFilterSheet";
import { activeFilterCount, EMPTY_CALL_FILTERS } from "@/src/components/call/filter-options";

export default function CallScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const s = styles(colors);
  const [language, setLanguage] = useState("all");
  const [preferences, setPreferences] = useState({ ...EMPTY_CALL_FILTERS });
  const [filterOpen, setFilterOpen] = useState(false);
  const filterCount = activeFilterCount(preferences);
  const filters = useMemo(() => {
    // Only the user's saved learning languages. Never insert native/defaults.
    const choices = user?.learning_languages?.length ? user.learning_languages : [user?.learning_language];
    const codes = [...new Set(choices.filter((code): code is string => !!code && LANGUAGES.some(l => l.code === code)))].slice(0, 3);
    return [{ code: "all", name: "All" }, ...codes.map(code => ({ code, name: langName(code) }))];
  }, [user?.learning_languages, user?.learning_language]);
  const p = usePracticeCalls(language, preferences);
  return <SafeAreaView style={s.root} testID="call-screen">
    <View style={s.header}>
      <Pressable testID="call-back-btn" accessibilityLabel="Back" onPress={() => router.back()} style={s.iconBtn}><Ionicons name="chevron-back" size={24} color={colors.onSurface} /></Pressable>
      <AppTitle testID="call-page-title" variant="page" style={s.heading}>Call</AppTitle>
      <Pressable testID="call-voice-rooms-btn" onPress={() => router.push("/(tabs)/voice")} style={s.rooms}><Ionicons name="mic" size={17} color={colors.onBrandSecondary} /><Text style={s.link}>Voice rooms</Text></Pressable>
    </View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.intro}><Text testID="call-page-subtitle" style={s.introText}>Find your people. Practice your words.</Text></View>
      <View style={s.availability}>
        <View style={[s.statusIcon, p.available && { backgroundColor: colors.brandSecondary }]}><Ionicons name={p.available ? "radio-outline" : "headset-outline"} color={p.available ? colors.brand : colors.onSurfaceSecondary} size={22} /></View>
        <View style={s.flex}><Text testID="practice-availability-title" style={s.subtitle}>Available to talk</Text><Text testID="practice-availability-info" style={s.copy}>{p.available ? "You’re visible to other partners" : "Your next conversation starts here"}</Text></View>
        <Pressable testID="practice-availability-switch" role="switch" aria-checked={p.available} accessibilityRole="switch" accessibilityState={{ checked: p.available, disabled: p.pending || p.busy }} disabled={p.pending || p.busy} onPress={p.toggle} style={s.switchHit}>
          <View style={[s.switch, p.available && { backgroundColor: colors.brand }]}>{p.pending ? <ActivityIndicator size="small" color={colors.onBrand} /> : <View style={[s.knob, { alignSelf: p.available ? "flex-end" : "flex-start" }]} />}</View>
        </Pressable>
      </View>
      <View style={s.filterSection}>
        <View style={s.filterHeading}><Text testID="practice-language-label" style={s.label}>FIND A CONVERSATION</Text>
          <Pressable testID="call-open-filters" accessibilityLabel="Filter call partners" disabled={p.searching || p.busy || p.loading} onPress={() => setFilterOpen(true)} style={[s.filterButton, filterCount > 0 && { backgroundColor: colors.brandSecondary }]}><Ionicons name="options-outline" size={18} color={colors.brand} /><Text testID="call-active-filter-count" style={s.filterButtonText}>Filters{filterCount ? ` · ${filterCount}` : ""}</Text></Pressable>
        </View>
        <View style={s.filters} testID="practice-language-filters">
          {filters.map(l => <Pressable key={l.code} testID={`practice-language-${l.code}`} accessibilityRole="tab" accessibilityState={{ selected: language === l.code, disabled: p.searching || p.busy }} disabled={p.searching || p.busy}
            onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setLanguage(l.code); }} style={[s.chip, language === l.code && s.chipActive]}>
            <Text numberOfLines={1} style={[s.chipText, language === l.code && { color: colors.onBrandSecondary }]}>{l.name}</Text>
            {language === l.code && <View style={s.chipDot} />}
          </Pressable>)}
        </View>
        {filterCount > 0 && <View style={s.appliedRow}><Text testID="call-filter-summary" style={s.appliedText}>{[preferences.country, preferences.native_language && langName(preferences.native_language), preferences.gender, preferences.age_group, preferences.level, preferences.has_avatar && "With photo"].filter(Boolean).join(" · ")}</Text><Pressable testID="call-clear-filters" accessibilityLabel="Clear all filters" disabled={p.searching || p.busy} onPress={() => setPreferences({ ...EMPTY_CALL_FILTERS })} style={s.clearFilters}><Ionicons name="close-circle" color={colors.onSurfaceSecondary} size={20} /></Pressable></View>}
      </View>
      <RandomPartner searching={p.searching} disabled={!p.available || p.busy || p.pending || p.loading} onStart={p.search} onCancel={p.stop} />
      {!!p.error && <View style={s.errorBox}><Ionicons name="information-circle-outline" color={colors.error} size={18} /><Text testID="practice-error" accessibilityRole="alert" style={s.error}>{p.error}</Text></View>}
      <View style={s.sectionHeader}><View style={s.flex}><Text testID="practice-partners-heading" style={s.section}>Ready to connect</Text><Text testID="practice-list-filter-label" style={s.copy}>{language === "all" ? "Available partners from every language" : `${langName(language)} language partners`}</Text></View>
        <View style={s.countPill}><View style={s.liveDot} /><Text testID="practice-partner-count" style={s.count}>{p.partners.length} online</Text></View>
      </View>
      {p.loading ? <ActivityIndicator testID="practice-loading" color={colors.brand} /> : p.partners.length === 0 ? <View style={s.empty}>
        <View style={s.emptyIcon}><Ionicons name="people-outline" size={26} color={colors.onSurfaceSecondary} /></View>
        <Text testID="practice-empty-title" style={s.subtitle}>A little quiet right now</Text>
        <Text testID="practice-empty-description" style={[s.copy, s.center]}>{filterCount ? "No available partners match your filters yet. Try fewer preferences or stay available for a match." : `No available partners ${language === "all" ? "at the moment" : "in this language yet"}. Stay available, try Random Partner, or check back in a little while.`}</Text>
      </View> : <View style={s.partnerList}>{p.partners.map(peer => <View key={peer.id} testID={`practice-partner-${peer.id}`} style={s.partner}>
        <Pressable testID={`practice-profile-${peer.id}`} accessibilityLabel={`View ${peer.name}'s profile`} onPress={() => router.push(`/user/${peer.id}`)}>
          <ProfileAvatar testID={`practice-avatar-${peer.id}`} user={peer} online />
        </Pressable>
        <View style={s.flex}><View style={s.partnerNameRow}><Text testID={`practice-partner-name-${peer.id}`} numberOfLines={1} style={[s.subtitle, s.partnerName]}>{peer.name}</Text>{peer.is_vip && <VipBadge small tier={peer.vip_tier} />}</View><Text testID={`practice-partner-languages-${peer.id}`} style={s.copy}>{langName(peer.native_language)} <Text style={s.arrow}>→</Text> {peer.practice_language === "all" ? "All languages" : langName(peer.practice_language)}</Text></View>
        <Pressable testID={`practice-call-${peer.id}`} accessibilityLabel={`Call ${peer.name}`} disabled={!p.available || p.pending || p.busy || p.searching || p.loading} onPress={() => p.callPartner(peer)} style={({ pressed }) => [s.callBtn, { opacity: !p.available || p.pending || p.searching || p.loading || pressed ? 0.4 : 1 }]}><Ionicons name="call" size={20} color={colors.brand} /></Pressable>
      </View>)}</View>}
      <View style={s.captionInfo}><View style={s.captionIcon}><Ionicons name="language" size={20} color={colors.brand} /></View><View style={s.flex}>
        <Text testID="practice-native-language" style={s.captionTitle}>Feel at home in {langName(user?.native_language)}</Text>
        <Text testID="practice-caption-info" style={s.copy}>Your live transcript is translated into your native language. Enable captions together during a call.</Text>
      </View></View>
      <View style={s.safety}><Ionicons name="shield-checkmark-outline" size={14} color={colors.onSurfaceSecondary} /><Text testID="practice-safety-note" style={s.safetyText}>Your choice. Your pace. Leave any call, anytime.</Text></View>
    </ScrollView>
    {filterOpen && <CallFilterSheet applied={preferences} onApply={setPreferences} onClose={() => setFilterOpen(false)} />}
  </SafeAreaView>;
}
const styles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.surface }, header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 4, paddingVertical: 12, minHeight: 68 },
  heading: { flex: 1, color: c.onSurface }, iconBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  rooms: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, borderRadius: 24, backgroundColor: c.brandTertiary }, link: { color: c.onBrandSecondary, fontFamily: fonts.textBold, fontSize: 12 },
  content: { padding: 20, gap: 24, paddingBottom: 32 }, intro: { marginTop: -8, marginBottom: -4 }, introText: { fontSize: 13, lineHeight: 20, color: c.onSurfaceSecondary, fontFamily: fonts.text }, flex: { flex: 1, minWidth: 0, gap: 4 },
  availability: { flexDirection: "row", gap: 10, alignItems: "center", borderRadius: 20, padding: 14, borderColor: c.border, borderWidth: 1 }, statusIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSecondary },
  subtitle: { fontFamily: fonts.textBold, fontSize: 15, lineHeight: 21, color: c.onSurface }, copy: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.onSurfaceSecondary },
  switchHit: { width: 50, minHeight: 44, justifyContent: "center" }, switch: { width: 50, height: 30, borderRadius: 18, backgroundColor: c.borderStrong, justifyContent: "center", padding: 4 }, knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: c.surface },
  filterSection: { gap: 12 }, label: { fontFamily: fonts.textBold, fontSize: 10, letterSpacing: 1.3, color: c.onSurfaceSecondary },
  filterHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, marginVertical: -8 }, filterButton: { minHeight: 44, borderRadius: 22, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 5 }, filterButtonText: { fontFamily: fonts.textBold, fontSize: 12, color: c.brand },
  appliedRow: { flexDirection: "row", alignItems: "center", backgroundColor: c.brandTertiary, borderRadius: 12, paddingLeft: 12 }, appliedText: { flex: 1, fontSize: 11, lineHeight: 17, fontFamily: fonts.text, color: c.onBrandSecondary }, clearFilters: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  filters: { flexDirection: "row", gap: 4, backgroundColor: c.surfaceSecondary, padding: 4, borderRadius: 18 }, chip: { flex: 1, minWidth: 0, minHeight: 48, borderRadius: 14, paddingHorizontal: 4, justifyContent: "center", alignItems: "center", gap: 4 }, chipActive: { backgroundColor: c.surface }, chipText: { fontFamily: fonts.textBold, fontSize: 12, color: c.onSurfaceSecondary }, chipDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: c.brand, position: "absolute", bottom: 5 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 }, section: { fontFamily: fonts.displaySemi, fontSize: 20, color: c.onSurface }, countPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.brandTertiary, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 20 }, liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.brand }, count: { fontSize: 10, fontFamily: fonts.textBold, color: c.onBrandSecondary },
  empty: { alignItems: "center", gap: 10, padding: 24, backgroundColor: c.surfaceSecondary, borderRadius: 22, marginTop: -8 }, emptyIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", marginBottom: 2 }, center: { textAlign: "center" },
  partnerList: { gap: 10, marginTop: -8 }, partner: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: c.border, padding: 14, borderRadius: 20 }, arrow: { color: c.brand },
  partnerNameRow: { flexDirection: "row", alignItems: "center", gap: 4 }, partnerName: { flexShrink: 1 },
  callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.brandSecondary, alignItems: "center", justifyContent: "center" }, captionInfo: { flexDirection: "row", gap: 12, padding: 16, borderWidth: 1, borderColor: c.border, borderRadius: 20 }, captionIcon: { width: 32, height: 32, alignItems: "center", justifyContent: "center" }, captionTitle: { color: c.onSurface, fontFamily: fonts.textBold, fontSize: 14 },
  safety: { flexDirection: "row", justifyContent: "center", gap: 6, alignItems: "center" }, safetyText: { flexShrink: 1, fontSize: 10, lineHeight: 16, textAlign: "center", color: c.onSurfaceSecondary, fontFamily: fonts.text }, errorBox: { flexDirection: "row", gap: 8, alignItems: "flex-start" }, error: { flex: 1, color: c.error, fontSize: 13, lineHeight: 20, fontFamily: fonts.text },
});