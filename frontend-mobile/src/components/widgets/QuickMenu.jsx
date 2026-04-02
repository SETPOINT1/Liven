import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radius } from '../../theme';
import { ChatbotIcon, ParcelIcon, EventIcon } from '../TabIcons';

const menus = [
  { label: 'แชท', color: '#2B6CB0', icon: ChatbotIcon, screen: 'Chatbot' },
  { label: 'พัสดุ', color: '#D69E2E', icon: ParcelIcon, screen: 'Parcel', badge: null },
  { label: 'กิจกรรม', color: '#38A169', icon: EventIcon, screen: 'News' },
];

export default function QuickMenu({ navigation, parcelCount }) {
  const items = menus.map(m => m.label === 'พัสดุ' ? { ...m, badge: parcelCount || 0 } : m);
  return (
    <View style={s.container}>
      <Text style={s.title}>เมนูด่วน</Text>
      <View style={s.row}>
        {items.map((m) => {
          const IconComp = m.icon;
          return (
            <TouchableOpacity key={m.label} style={s.item} onPress={() => navigation.navigate(m.screen)} activeOpacity={0.7}>
              <View style={[s.circle, { backgroundColor: m.color + '18' }]}>
                <IconComp size={24} color={m.color} />
                {m.badge > 0 && <View style={s.badge}><Text style={s.badgeText}>{m.badge}</Text></View>}
              </View>
              <Text style={s.label}>{m.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { backgroundColor: colors.card, borderRadius: radius.md, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  item: { alignItems: 'center', width: 72 },
  circle: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 6, position: 'relative' },
  badge: { position: 'absolute', top: -2, right: -2, backgroundColor: colors.danger, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.card },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  label: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
});
