import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, radius } from '../../theme';
import { EventIcon } from '../TabIcons';

export default function EventWidget({ data, onPress }) {
  const loading = data === null;
  const events = data
    ? [...data].sort((a, b) => new Date(b.event_date || b.created_at) - new Date(a.event_date || a.created_at)).slice(0, 2)
    : [];

  const formatDate = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  };
  const formatDay = (d) => {
    if (!d) return '';
    return new Date(d).getDate().toString();
  };
  const formatMonth = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('th-TH', { month: 'short' });
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>กิจกรรมในชุมชน</Text>
        <TouchableOpacity onPress={onPress} accessibilityLabel="ดูกิจกรรมทั้งหมด" accessibilityRole="button">
          <Text style={s.link}>ดูทั้งหมด ›</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 12 }} />
      ) : events.length === 0 ? (
        <View style={s.emptyCard}>
          <EventIcon size={28} color={colors.textMuted} />
          <Text style={s.emptyText}>ยังไม่มีกิจกรรม</Text>
        </View>
      ) : (
        events.map((ev) => (
          <View key={ev.id} style={s.card}>
            <View style={s.dateBox}>
              <Text style={s.dateDay}>{formatDay(ev.event_date)}</Text>
              <Text style={s.dateMonth}>{formatMonth(ev.event_date)}</Text>
            </View>
            <View style={s.cardContent}>
              <Text style={s.evTitle} numberOfLines={2}>{ev.title}</Text>
              {ev.location ? <Text style={s.evMeta}>📍 {ev.location}</Text> : null}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginBottom: 12, marginHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  link: { fontSize: 13, color: colors.accent, fontWeight: '500' },
  card: {
    backgroundColor: colors.card, borderRadius: radius.md, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  dateBox: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: colors.accentLight,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  dateDay: { fontSize: 18, fontWeight: '700', color: colors.accent, lineHeight: 20 },
  dateMonth: { fontSize: 11, color: colors.accent, fontWeight: '500', marginTop: 1 },
  cardContent: { flex: 1 },
  evTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 3 },
  evMeta: { fontSize: 12, color: colors.textMuted },
  emptyCard: {
    backgroundColor: colors.card, borderRadius: radius.md, padding: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyText: { fontSize: 13, color: colors.textMuted, marginTop: 8 },
});
