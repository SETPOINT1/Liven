import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, radius } from '../../theme';

const pConfig = {
  emergency: { dot: colors.danger, bg: '#FFF5F5', label: 'ฉุกเฉิน' },
  important: { dot: colors.warning, bg: '#FFFFF0', label: 'สำคัญ' },
  normal: { dot: '#805AD5', bg: '#FAF5FF', label: 'ทั่วไป' },
};

export default function AnnouncementWidget({ data, onPress }) {
  const loading = data === null;
  const order = { emergency: 0, important: 1, normal: 2 };
  const items = data
    ? [...data].sort((a, b) => (order[a.priority] ?? 2) - (order[b.priority] ?? 2)).slice(0, 3)
    : [];

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '';

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>ประกาศ</Text>
        <TouchableOpacity onPress={onPress} accessibilityLabel="ดูประกาศทั้งหมด" accessibilityRole="button">
          <Text style={s.link}>ดูทั้งหมด ›</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 8 }} />
      ) : items.length === 0 ? (
        <Text style={s.muted}>ไม่มีประกาศ</Text>
      ) : (
        <View style={s.list}>
          {items.map((a) => {
            const p = pConfig[a.priority] || pConfig.normal;
            return (
              <View key={a.id} style={s.item}>
                <View style={[s.dot, { backgroundColor: p.dot }]} />
                <View style={s.itemContent}>
                  <Text style={s.itemTitle} numberOfLines={1}>{a.title}</Text>
                  <Text style={s.itemDate}>{formatDate(a.created_at)}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: p.bg }]}>
                  <Text style={[s.badgeText, { color: p.dot }]}>{p.label}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginBottom: 12, marginHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  link: { fontSize: 13, color: colors.accent, fontWeight: '500' },
  list: {
    backgroundColor: colors.card, borderRadius: radius.md, overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  item: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderBottomWidth: 1, borderBottomColor: colors.bg,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  itemDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  muted: { color: colors.textMuted, fontSize: 13 },
});
