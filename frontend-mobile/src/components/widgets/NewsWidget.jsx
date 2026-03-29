import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import api from '../../services/api';

const NewsWidget = ({ onPress }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const [annRes, evtRes] = await Promise.all([
          api.get('/announcements/').catch(() => ({ data: [] })),
          api.get('/events/').catch(() => ({ data: [] })),
        ]);
        const announcements = (annRes.data.results || annRes.data || []).map((a) => ({
          id: a.id,
          title: a.title,
          type: 'announcement',
          priority: a.priority,
          date: a.created_at,
        }));
        const events = (evtRes.data.results || evtRes.data || []).map((e) => ({
          id: e.id,
          title: e.title,
          type: 'event',
          priority: 'normal',
          date: e.event_date || e.created_at,
        }));
        const combined = [...announcements, ...events]
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 5);
        setItems(combined);
      } catch { /* silent */ }
      setLoading(false);
    };
    fetchNews();
  }, []);

  const getIcon = (item) => {
    if (item.type === 'event') return '📅';
    if (item.priority === 'emergency') return '🚨';
    if (item.priority === 'important') return '⚠️';
    return '📢';
  };

  const getColor = (item) => {
    if (item.type === 'event') return '#4F46E5';
    if (item.priority === 'emergency') return '#DC2626';
    if (item.priority === 'important') return '#F59E0B';
    return '#6B7280';
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.title}>📢 ข่าวสารและกิจกรรม</Text>
      {loading ? (
        <Text style={styles.loadingText}>กำลังโหลด...</Text>
      ) : items.length === 0 ? (
        <Text style={styles.emptyText}>ไม่มีข่าวสารหรือกิจกรรม</Text>
      ) : (
        items.map((item) => (
          <View key={`${item.type}-${item.id}`} style={styles.item}>
            <Text style={{ marginRight: 6 }}>{getIcon(item)}</Text>
            <View style={[styles.dot, { backgroundColor: getColor(item) }]} />
            <Text style={styles.itemText} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.badge}>
              {item.type === 'event' ? 'กิจกรรม' : 'ประกาศ'}
            </Text>
          </View>
        ))
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  title: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 10 },
  item: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  itemText: { fontSize: 14, color: '#374151', flex: 1 },
  badge: { fontSize: 11, color: '#6B7280', backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginLeft: 4 },
  loadingText: { color: '#9CA3AF', fontSize: 13 },
  emptyText: { color: '#9CA3AF', fontSize: 13 },
});

export default NewsWidget;
