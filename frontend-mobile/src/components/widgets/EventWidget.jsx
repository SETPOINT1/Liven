import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import api from '../../services/api';
import { colors, radius } from '../../theme';
export default function EventWidget({ onPress, navigation }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/events/');
        const data = (res.data.results || res.data || []).sort((a, b) => new Date(b.event_date || b.created_at) - new Date(a.event_date || a.created_at)).slice(0, 2);
        setEvents(data);
      } catch {}
      setLoading(false);
    })();
  }, []);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>กิจกรรมในชุมชน</Text>
        <TouchableOpacity onPress={onPress}><Text style={s.link}>ดูทั้งหมด</Text></TouchableOpacity>
      </View>
      {loading ? <Text style={s.muted}>กำลังโหลด...</Text> : events.length === 0 ? <Text style={s.muted}>ไม่มีกิจกรรม</Text> : (
        events.map((ev) => (
          <View key={ev.id} style={s.card}>
            <Text style={s.evTitle} numberOfLines={1}>{ev.title}</Text>
            <Text style={s.evMeta}>{formatDate(ev.event_date)} {formatTime(ev.event_date) ? '• ' + formatTime(ev.event_date) : ''}</Text>
            {ev.location ? <Text style={s.evMeta}>{ev.location}</Text> : null}
          </View>
        ))
      )}
    </View>
  );
}
const s = StyleSheet.create({
  container: { marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  link: { fontSize: 13, color: colors.accent, fontWeight: '500' },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, marginBottom: 8, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  evTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 },
  evMeta: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
  muted: { color: colors.textMuted, fontSize: 13 },
});
