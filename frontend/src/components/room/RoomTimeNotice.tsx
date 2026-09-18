import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { fonts } from '@/src/theme';
import { Ionicons } from '@/src/ui/icons';
import { BoundedSheet } from '@/src/components/layout/BoundedSheet';

export function RoomTimeNotice({ message, onClose }: { message: string | null; onClose: () => void }) {
  const { colors } = useTheme();
  return <Modal visible={!!message} transparent animationType="fade" onRequestClose={onClose}>
    <View style={s.backdrop}>
      <BoundedSheet testID="room-time-notice" accessibilityViewIsModal style={[s.card, { backgroundColor: colors.surface }]}>
        <Ionicons name="time-outline" size={28} color={colors.brand} />
        <Text testID="room-time-notice-title" style={[s.title, { color: colors.onSurface }]}>Voiceroom time</Text>
        <Text testID="room-time-notice-message" style={[s.text, { color: colors.onSurfaceSecondary }]}>{message}</Text>
        <Pressable testID="room-time-notice-close" onPress={onClose} style={[s.button, { backgroundColor: colors.brand }]}>
          <Text style={[s.label, { color: colors.onBrand }]}>Got it</Text>
        </Pressable>
      </BoundedSheet>
    </View>
  </Modal>;
}
const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.45)' },
  card: { borderRadius: 24, padding: 24, gap: 16 }, title: { fontFamily: fonts.displayBold, fontSize: 20 },
  text: { fontFamily: fonts.text, fontSize: 15, lineHeight: 23 }, button: { minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.textBold, fontSize: 15 },
});