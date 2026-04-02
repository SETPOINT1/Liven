import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radius } from '../../theme';
import { ChatbotIcon, ParcelIcon, EventIcon, FacilityIcon } from '../TabIcons';

const menus = [
  { label: 'ส่วนกลาง', color: '#0C2340', bg: '#E8EDF3', icon: FacilityIcon, screen: 'Facility' },
  { label: 'แชท', color: '#2B6CB0', bg: '#EBF4FF', icon: ChatbotIcon, screen: 'Chatbot' },
  { label: 'พัสดุ', color: '#B7791F', bg: '#FEFCBF', icon: ParcelIcon, screen: 'Parcel', badge: null },
  { label: 'ข่าวสาร', color: '#276749', bg: '#C6F6D5', icon: EventIcon, screen: 'News' },
];

export default function QuickMenu({ navigation, parcelCount }) {
  const items = menus.map(m =>
    m.label === 'พัสดุ' ? { ...m, badge: parcelCount || 0 } : m
  );

  return (
    <View style={s.container}>
      <View style={s.row}>
        {items.map((m) => {
          const IconComp = m.icon;
          return (
            <TouchableOpacity
              key={m.label} style={s.item}
              onPress={() => navigation.navigate(m.screen)}
              activeOpacity={0.65}
              accessibilityLabel={m.label} accessibilityRole="button"
            >
              <View style={[s.circle, { backgroundColor: m.bg }]}>
                <IconComp size={26} color={m.color} />
                {m.badge > 0 && (
                  <View style={s.badge}><Text style={s.badgeText}>{m.badge}</Text></View>
                )}
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
  container: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 18, paddingBottom: 14,
    marginBottom: 12, marginHorizontal: 16,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  item: { alignItems: 'center', flex: 1 },
  circle: {
    width: 56, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8, position: 'relative',
  },
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: colors.danger, borderRadius: 10, minWidth: 20, height: 20,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.card,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  label: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
});
