import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import api from '../../services/api';
import { colors, radius } from '../../theme';

const NewsWidget = ({ onPress }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [annRes, evtRes] = await Promise.all([
          api.get('/announcements/').catch(() => ({ data: [] })),
          api.get('/events/').catch(() => ({ data: [] })),
        ]);
        const anns = (annRes.data.results || annRes.data || []).map((a) => ({ id: a.id, title: a.title, type: 'announcement', priority: a.priority, date: a.created_at }));
        const evts = (evtRes.data.results || evtRes.data || []).map((e) => ({ id: e.id, title: e.title, type: 'event', priority: 'normal', date: e.event_date || e.created_at }));
        setItems([...anns, ...evts].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5));
      } catch {}
      setLoading(false);
    })();
  }, []);

  const getColor = (item) => {
    if (item.type === 'event') return colors.accent;
    if (item.priority === 'emergency') return colors.danger;
    if (item.priority === 'important') return colors.warning;
    return colors.textMuted;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.title}>ข่าวสารและกิจกรรม</Text>
      {loading ? <Text style={styles.muted}>กำลังโหลด...</Text> : items.length === 0 ? <Text style={styles.muted}>ไม่มีข่าวสาร</Text> : (
        items.map((item) => (
          <View key={`${item.type}-${item.id}`} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: getColor(item) }]} />
            <Text style={styles.itemText} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.badge}>{item.type === 'event' ? 'กิจกรรม' : 'ประกาศ'}</Text>
          </View>
        ))
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },
  item: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  itemText: { fontSize: 14, color: colors.textSecondary, flex: 1 },
  badge: { fontSize: 11, color: colors.textMuted, backgroundColor: colors.bg, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginLeft: 4 },
  muted: { color: colors.textMuted, fontSize: 13 },
});

export default NewsWidget;
