import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import api from '../services/api';

import { colors, radius } from '../theme';

const tabOptions = ['ทั้งหมด', 'ประกาศ', 'กิจกรรม'];

const priorityLabels = { emergency: 'ฉุกเฉิน', important: 'สำคัญ', normal: 'ทั่วไป' };
const priorityColors = { emergency: colors.danger, important: colors.warning, normal: colors.textSecondary };

const NewsScreen = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('ทั้งหมด');

  const fetchData = useCallback(async () => {
    try {
      const [annRes, evtRes] = await Promise.all([
        api.get('/announcements/').catch(() => ({ data: [] })),
        api.get('/events/').catch(() => ({ data: [] })),
      ]);
      const announcements = (annRes.data.results || annRes.data || []).map((a) => ({
        id: a.id, title: a.title, content: a.content,
        type: 'announcement', priority: a.priority || 'normal',
        date: a.created_at, author_name: a.author_name || '',
      }));
      const events = (evtRes.data.results || evtRes.data || []).map((e) => ({
        id: e.id, title: e.title, content: e.description || '',
        type: 'event', priority: 'normal',
        date: e.event_date || e.created_at, location: e.location || '',
        author_name: e.author_name || '',
      }));
      const combined = [...announcements, ...events]
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      setItems(combined);
    } catch { /* silent */ }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = items.filter((item) => {
    if (activeTab === 'ประกาศ') return item.type === 'announcement';
    if (activeTab === 'กิจกรรม') return item.type === 'event';
    return true;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const renderItem = ({ item }) => {
    const isEvent = item.type === 'event';
    return (
      <View style={[styles.card, isEvent && styles.eventCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.icon}>{isEvent ? '◫' : '▤'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.typeBadge}>
                {isEvent ? 'กิจกรรม' : 'ประกาศ'}
              </Text>
              {!isEvent && (
                <Text style={[styles.priorityBadge, { color: priorityColors[item.priority] }]}>
                  {priorityLabels[item.priority]}
                </Text>
              )}
              <Text style={styles.dateText}>{formatDate(item.date)}</Text>
            </View>
          </View>
        </View>
        {item.content ? (
          <Text style={styles.contentText} numberOfLines={3}>{item.content}</Text>
        ) : null}
        {isEvent && item.location ? (
          <Text style={styles.locationText}>📍 {item.location}</Text>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {tabOptions.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
        ListEmptyComponent={<Text style={styles.emptyText}>ไม่มีข่าวสารหรือกิจกรรม</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingTop: 8 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  tab: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, marginRight: 8, backgroundColor: colors.border },
  activeTab: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  activeTabText: { color: '#FFF' },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  eventCard: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  icon: { fontSize: 20, marginRight: 10, marginTop: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  typeBadge: { fontSize: 11, color: colors.primary, backgroundColor: colors.accentLight, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  priorityBadge: { fontSize: 11, fontWeight: '600' },
  dateText: { fontSize: 11, color: colors.textMuted },
  contentText: { fontSize: 14, color: colors.textSecondary, marginTop: 10, lineHeight: 20 },
  locationText: { fontSize: 13, color: colors.textSecondary, marginTop: 6 },
  emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: 40, fontSize: 14 },
});

export default NewsScreen;


