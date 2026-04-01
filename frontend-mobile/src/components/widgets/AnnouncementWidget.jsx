import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import api from '../../services/api';
import { colors, radius } from '../../theme';
const priorityStyle = { emergency: { border: '#E53E3E', bg: '#FFF5F5' }, important: { border: '#D69E2E', bg: '#FFFFF0' }, normal: { border: '#805AD5', bg: '#FAF5FF' } };
const priorityLabel = { emergency: 'ฉุกเฉิน', important: 'สำคัญ', normal: 'ทั่วไป' };
export default function AnnouncementWidget({ onPress }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/announcements/');
        const data = (res.data.results || res.data || []).slice(0, 3);
        const order = { emergency: 0, important: 1, normal: 2 };
        data.sort((a, b) => (order[a.priority] ?? 2) - (order[b.priority] ?? 2));
        setItems(data);
      } catch {}
      setLoading(false);
    })();
  }, []);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>ประกาศจากนิติบุคคล</Text>
        <TouchableOpacity onPress={onPress}><Text style={s.link}>ดูทั้งหมด</Text></TouchableOpacity>
      </View>
      {loading ? <Text style={s.muted}>กำลังโหลด...</Text> : items.length === 0 ? <Text style={s.muted}>ไม่มีประกาศ</Text> : (
        items.map((a) => {
          const ps = priorityStyle[a.priority] || priorityStyle.normal;
          return (
            <View key={a.id} style={[s.card, { borderLeftColor: ps.border, backgroundColor: ps.bg }]}>
              <View style={s.cardHeader}>
                <Text style={s.cardTitle} numberOfLines={1}>{a.title}</Text>
                <Text style={[s.badge, { color: ps.border }]}>{priorityLabel[a.priority] || 'ทั่วไป'}</Text>
              </View>
              {a.content ? <Text style={s.cardContent} numberOfLines={2}>{a.content}</Text> : null}
              <Text style={s.cardDate}>{formatDate(a.created_at)}</Text>
            </View>
          );
        })
      )}
    </View>
  );
}
const s = StyleSheet.create({
  container: { marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  link: { fontSize: 13, color: colors.accent, fontWeight: '500' },
  card: { borderLeftWidth: 4, borderRadius: radius.sm, padding: 14, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1, marginRight: 8 },
  badge: { fontSize: 11, fontWeight: '600' },
  cardContent: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 4 },
  cardDate: { fontSize: 11, color: colors.textMuted },
  muted: { color: colors.textMuted, fontSize: 13 },
});
