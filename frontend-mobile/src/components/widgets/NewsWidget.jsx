import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import api from '../../services/api';

const NewsWidget = ({ onPress }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await api.get('/announcements/');
        setAnnouncements((res.data.results || res.data || []).slice(0, 3));
      } catch {
        // silent
      }
      setLoading(false);
    };
    fetchNews();
  }, []);

  const priorityColor = (p) => {
    if (p === 'emergency') return '#DC2626';
    if (p === 'important') return '#F59E0B';
    return '#6B7280';
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.title}>📢 ข่าวสารล่าสุด</Text>
      {loading ? (
        <Text style={styles.loadingText}>กำลังโหลด...</Text>
      ) : announcements.length === 0 ? (
        <Text style={styles.emptyText}>ไม่มีข่าวสาร</Text>
      ) : (
        announcements.map((a) => (
          <View key={a.id} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: priorityColor(a.priority) }]} />
            <Text style={styles.itemText} numberOfLines={1}>{a.title}</Text>
          </View>
        ))
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  title: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 10 },
  item: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  itemText: { fontSize: 14, color: '#374151', flex: 1 },
  loadingText: { color: '#9CA3AF', fontSize: 13 },
  emptyText: { color: '#9CA3AF', fontSize: 13 },
});

export default NewsWidget;
