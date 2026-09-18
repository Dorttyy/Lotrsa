import React, { useState } from "react";
import { Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { KeyboardAvoidingView } from "@/src/components/layout/KeyboardAvoidingView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, ThemeColors } from "@/src/theme";
import { Ionicons } from "@/src/ui/icons";
import { COUNTRIES, countryToCode } from "@/src/constants/countries";
import { RoundFlag } from "@/src/components/RoundFlag";
import { LANGUAGES, langName, PROFICIENCY_LEVELS } from "@/src/constants/languages";
import { activeFilterCount, CallFilters, EMPTY_CALL_FILTERS } from "./filter-options";

type PickerKey = "country" | "native_language";
const SheetHost = Platform.OS === "web" ? View : KeyboardAvoidingView;

function FilterChips({ field, title, choices, value, onChange }: {
  field: string; title: string; choices: { value: string; label: string }[]; value: string; onChange: (value: string) => void;
}) {
  const { colors } = useTheme();
  const s = styles(colors);
  return <View style={s.section}>
    <Text testID={`call-filter-${field}-label`} style={s.sectionTitle}>{title}</Text>
    <View style={s.chipRow}>{choices.map(choice => <Pressable key={choice.value} testID={`call-filter-${field}-${choice.value.toLowerCase() || "any"}`} accessibilityRole="radio" accessibilityState={{ checked: value === choice.value }}
      onPress={() => onChange(choice.value)} style={[s.chip, choice.value === value && s.selectedChip]}><Text style={[s.chipText, choice.value === value && { color: colors.brand }]}>{choice.label}</Text></Pressable>)}</View>
  </View>;
}

export function CallFilterSheet({ applied, onApply, onClose }: {
  applied: CallFilters; onApply: (filters: CallFilters) => void; onClose: () => void;
}) {
  const { colors } = useTheme();
  const s = styles(colors);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState({ ...applied });
  const [picker, setPicker] = useState<PickerKey | null>(null);
  const [search, setSearch] = useState("");
  const count = activeFilterCount(draft);
  const choose = (field: keyof CallFilters, value: string | boolean) => setDraft(prev => ({ ...prev, [field]: value }));
  const back = () => { Keyboard.dismiss(); if (picker) { setPicker(null); setSearch(""); } else onClose(); };
  const openPicker = (field: PickerKey) => { setPicker(field); setSearch(""); };
  const options = (picker === "country" ? COUNTRIES.map(c => ({ value: c.name, key: c.code, name: c.name })) : LANGUAGES.map(l => ({ value: l.code, key: l.code, name: l.name })))
    .filter(option => option.name.toLowerCase().includes(search.trim().toLowerCase()));
  const pick = (value: string) => { if (picker) choose(picker, value); Keyboard.dismiss(); setPicker(null); setSearch(""); };
  return <Modal visible transparent animationType={Platform.OS === "web" ? "fade" : "slide"} onRequestClose={back}>
    <SheetHost style={s.backdrop} {...(Platform.OS === "web" ? {} : { behavior: "translate-with-padding" as const })}>
      <Pressable testID="call-filter-backdrop" accessibilityLabel="Close filters without applying" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View testID="call-filter-sheet" accessibilityViewIsModal style={[s.sheet, { height: Math.min(height * 0.88, 760), paddingBottom: insets.bottom + 16 }]}>
        <View style={s.handle} />
        <View style={s.header}>
          {picker && <Pressable testID="call-filter-picker-back" accessibilityLabel="Back to filters" onPress={back} style={s.iconBtn}><Ionicons name="chevron-back" size={22} color={colors.onSurface} /></Pressable>}
          <View style={s.flex}><Text testID="call-filter-sheet-title" style={s.title}>{picker === "country" ? "Choose a country" : picker ? "Native language" : "Find your kind of conversation"}</Text>
            {!picker && <Text testID="call-filter-draft-count" style={s.subtitle}>{count ? `${count} preference${count === 1 ? "" : "s"} selected` : "Make your next hello a better match"}</Text>}
          </View>
          <Pressable testID="call-filter-close" accessibilityLabel="Close filters without applying" onPress={onClose} style={s.iconBtn}><Ionicons name="close" size={22} color={colors.onSurface} /></Pressable>
        </View>
        {picker ? <>
          <View style={s.searchBox}><Ionicons name="search-outline" size={19} color={colors.onSurfaceSecondary} /><TextInput testID="call-filter-picker-search" value={search} onChangeText={setSearch} placeholder={picker === "country" ? "Search countries" : "Search languages"} placeholderTextColor={colors.onSurfaceSecondary} style={s.searchInput} autoCapitalize="none" autoCorrect={false} /></View>
          <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.pickerContent}>
            <Pressable testID={`call-filter-option-${picker}-any`} style={s.option} onPress={() => pick("")}><Text style={s.optionText}>Any {picker === "country" ? "country" : "native language"}</Text>{!draft[picker] && <Ionicons name="checkmark" size={21} color={colors.brand} />}</Pressable>
            {options.map(option => <Pressable key={option.key} testID={`call-filter-option-${picker}-${option.key}`} onPress={() => pick(option.value)} style={s.option}><RoundFlag testID={`call-filter-flag-${picker}-${option.key}`} country={picker === "country" ? option.key : undefined} code={picker === "native_language" ? option.value : undefined} /><Text style={s.optionText}>{option.name}</Text>{draft[picker] === option.value && <Ionicons name="checkmark" size={21} color={colors.brand} />}</Pressable>)}
            {options.length === 0 && <Text testID="call-filter-search-empty" style={s.subtitle}>No matching options. Try another search.</Text>}
          </ScrollView>
        </> : <>
          <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            <View style={s.notice}><Ionicons name="radio-outline" size={18} color={colors.brand} /><Text testID="call-filter-scope" style={s.noticeText}>Applies to available partners and Random Partner. Both people’s preferences are respected when matching.</Text></View>
            <View style={s.selectGroup}>
              <Pressable testID="call-filter-country-picker" style={s.selectRow} onPress={() => openPicker("country")}>{draft.country ? <RoundFlag testID="call-filter-selected-country-flag" country={countryToCode(draft.country)} /> : <Ionicons name="earth-outline" size={22} color={colors.brand} />}<View style={s.flex}><Text style={s.sectionTitle}>Country</Text><Text testID="call-filter-country-value" style={s.subtitle}>{draft.country || "Anywhere in the world"}</Text></View><Ionicons name="chevron-forward" color={colors.onSurfaceSecondary} size={18} /></Pressable>
              <View style={s.divider} />
              <Pressable testID="call-filter-native-language-picker" style={s.selectRow} onPress={() => openPicker("native_language")}>{draft.native_language ? <RoundFlag testID="call-filter-selected-language-flag" code={draft.native_language} /> : <Ionicons name="language" size={22} color={colors.brand} />}<View style={s.flex}><Text style={s.sectionTitle}>Partner’s native language</Text><Text testID="call-filter-native-language-value" style={s.subtitle}>{draft.native_language ? langName(draft.native_language) : "Any native language"}</Text></View><Ionicons name="chevron-forward" color={colors.onSurfaceSecondary} size={18} /></Pressable>
            </View>
            <FilterChips field="gender" title="Who would you like to talk to?" choices={[{ value: "", label: "Everyone" }, { value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }]} value={draft.gender} onChange={v => choose("gender", v)} />
            <FilterChips field="age" title="Age range" choices={[{ value: "", label: "Any age" }, ...["13-17", "18-24", "25-34", "35-44", "45+"].map(value => ({ value, label: value }))]} value={draft.age_group} onChange={v => choose("age_group", v)} />
            <FilterChips field="level" title="Partner’s learning level" choices={[{ value: "", label: "Any level" }, ...PROFICIENCY_LEVELS.map(value => ({ value, label: value }))]} value={draft.level} onChange={v => choose("level", v)} />
            <Pressable testID="call-filter-has-avatar" role="checkbox" aria-checked={draft.has_avatar} accessibilityRole="checkbox" accessibilityState={{ checked: draft.has_avatar }} onPress={() => choose("has_avatar", !draft.has_avatar)} style={s.photoRow}>
              <View style={s.flex}><Text style={s.sectionTitle}>With a profile photo</Text><Text style={s.subtitle}>Only show partners who’ve added a photo</Text></View><View style={[s.checkbox, draft.has_avatar && s.checked]}>{draft.has_avatar && <Ionicons name="checkmark" size={17} color={colors.onBrand} />}</View>
            </Pressable>
          </ScrollView>
          <View style={s.footer}><Pressable testID="call-filter-reset" onPress={() => setDraft({ ...EMPTY_CALL_FILTERS })} style={s.reset}><Text style={s.resetText}>Reset</Text></Pressable><Pressable testID="call-filter-apply" onPress={() => { onApply({ ...draft }); onClose(); }} style={({ pressed }) => [s.apply, { opacity: pressed ? 0.7 : 1 }]}><Text style={s.applyText}>Apply filters{count ? ` · ${count}` : ""}</Text><Ionicons name="arrow-forward" color={colors.onBrand} size={18} /></Pressable></View>
        </>}
      </View>
    </SheetHost>
  </Modal>;
}
const styles = (c: ThemeColors) => StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, justifyContent: "flex-end", alignItems: "center", backgroundColor: "rgba(5,16,30,0.5)" }, sheet: { width: "100%", maxWidth: 600, maxHeight: "100%", flexShrink: 1, backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" }, scroll: { flex: 1, minHeight: 0 },
  handle: { width: 36, height: 4, backgroundColor: c.borderStrong, alignSelf: "center", borderRadius: 4, marginTop: 12, marginBottom: 8 }, header: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 20, paddingBottom: 16 }, flex: { flex: 1, minWidth: 0, gap: 5 }, iconBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  title: { fontFamily: fonts.displaySemi, fontSize: 21, lineHeight: 27, color: c.onSurface }, subtitle: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.onSurfaceSecondary }, content: { paddingHorizontal: 20, paddingBottom: 24, gap: 28 },
  notice: { padding: 14, borderRadius: 16, backgroundColor: c.brandTertiary, flexDirection: "row", alignItems: "flex-start", gap: 10 }, noticeText: { flex: 1, color: c.onSurfaceSecondary, fontSize: 12, lineHeight: 19, fontFamily: fonts.text },
  selectGroup: { borderWidth: 1, borderColor: c.border, borderRadius: 20, paddingHorizontal: 14 }, selectRow: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12 }, divider: { height: 1, backgroundColor: c.divider }, section: { gap: 12 }, sectionTitle: { fontFamily: fonts.textBold, fontSize: 14, lineHeight: 20, color: c.onSurface },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, chip: { paddingHorizontal: 14, minHeight: 44, borderRadius: 24, justifyContent: "center", backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.surfaceSecondary }, selectedChip: { backgroundColor: c.brandTertiary, borderColor: c.brand }, chipText: { fontSize: 13, fontFamily: fonts.text, color: c.onSurfaceSecondary },
  photoRow: { flexDirection: "row", gap: 16, alignItems: "center", minHeight: 56 }, checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 1, borderColor: c.borderStrong, justifyContent: "center", alignItems: "center" }, checked: { backgroundColor: c.brand, borderColor: c.brand },
  footer: { flexShrink: 0, borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: 20, paddingTop: 16, flexDirection: "row", gap: 16 }, reset: { minHeight: 52, minWidth: 64, alignItems: "center", justifyContent: "center" }, resetText: { fontFamily: fonts.textBold, fontSize: 14, color: c.onSurfaceSecondary }, apply: { flex: 1, minHeight: 52, borderRadius: 28, backgroundColor: c.brand, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }, applyText: { color: c.onBrand, fontFamily: fonts.textBold, fontSize: 14 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 20, backgroundColor: c.surfaceSecondary, borderRadius: 16, paddingHorizontal: 14, marginBottom: 8 }, searchInput: { flex: 1, minHeight: 48, fontFamily: fonts.text, fontSize: 15, color: c.onSurface }, pickerContent: { paddingHorizontal: 20, paddingBottom: 24 }, option: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: c.divider, gap: 12 }, optionText: { fontFamily: fonts.text, fontSize: 15, color: c.onSurface, flex: 1 },
});