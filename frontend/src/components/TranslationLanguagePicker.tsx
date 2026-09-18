import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { TRANSLATION_LANGUAGES, TRANSLATION_NAMES } from '@/src/constants/translation-languages';
import { fonts } from '@/src/theme';

export function TranslationLanguagePicker({ value, onChange, prefix, disabled = false }: { value: string; onChange: (code: string) => void; prefix: string; disabled?: boolean }) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const search = query.trim().toLocaleLowerCase();
  const options = TRANSLATION_LANGUAGES.filter(l => `${l.code} ${l.name} ${l.nativeName}`.toLocaleLowerCase().includes(search));
  return <View style={s.root}>
    <Text testID={`${prefix}-selected`} style={[s.label, { color: colors.onSurfaceSecondary }]}>Translate to: {TRANSLATION_NAMES[value] || value}</Text>
    <TextInput testID={`${prefix}-search`} style={[s.search, { color: colors.onSurface, backgroundColor: colors.surfaceSecondary }]}
      value={query} onChangeText={setQuery} placeholder="Find a language…" placeholderTextColor={colors.onSurfaceSecondary}
      autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
    <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} contentContainerStyle={s.options}>
      {options.map(l => <Pressable key={l.code} testID={`${prefix}-${l.code}`} disabled={disabled} onPress={() => onChange(l.code)}
        accessibilityRole="button" accessibilityState={{ selected: value === l.code }}
        style={[s.option, { backgroundColor: value === l.code ? colors.brandTertiary : colors.surfaceSecondary }]}>
        <Text testID={`${prefix}-${l.code}-label`} style={[s.text, { color: value === l.code ? colors.brand : colors.onSurface }]}>{l.name}</Text>
      </Pressable>)}
      {!options.length && <Text testID={`${prefix}-empty`} style={[s.label, { color: colors.onSurfaceSecondary }]}>No matching language</Text>}
    </ScrollView>
  </View>;
}
const s = StyleSheet.create({
  root: { gap: 8, minWidth: 0 }, label: { fontFamily: fonts.textSemi, fontSize: 12 },
  search: { borderRadius: 12, paddingHorizontal: 12, height: 44, fontFamily: fonts.text, fontSize: 14 },
  options: { gap: 8, minHeight: 44 }, option: { minHeight: 44, borderRadius: 22, paddingHorizontal: 14, justifyContent: 'center' },
  text: { fontFamily: fonts.textSemi, fontSize: 13 },
});