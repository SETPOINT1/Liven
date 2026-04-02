import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { supabase } from '../services/supabase';
import { colors, radius, spacing } from '../theme';
import { FacilityIcon } from '../components/TabIcons';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400';

const FacilityScreen = () => {
  const navigation = useNavigation();
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setError(false);
    try {
      const res = await api.get('/facilities/');
      setFacilities(res.data.results || res.data || []);
    } catch {
      setError(true);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel('facilities-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'facilities' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const renderFacility = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('FacilityDetail', { facility: item })}
      accessibilityLabel={`${item.name} - ${item.is_active ? 'เปิดให้บริการ' : 'ปิดปรับปรุง'}`}
      accessibilityRole="button"
    >
      <Image source={{ uri: item.image_url || PLACEHOLDER_IMG }} style={styles.cardImage} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.facilityName} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.badge, item.is_active ? styles.available : styles.unavailable]}>
            <Text style={[styles.badgeText, { color: item.is_active ? '#065F46' : '#991B1B' }]}>
              {item.is_active ? 'เปิด' : 'ปิด'}
            </Text>
          </View>
        </View>
        <Text style={styles.type}>{item.type}</Text>
        {item.operating_hours ? <Text style={styles.hours}>🕐 {item.operating_hours}</Text> : null}
        {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
        <View style={styles.cardFooter}>
          {item.requires_booking ? (
            <View style={styles.bookTag}>
              <Text style={styles.bookTagText}>📅 ต้องจองล่วงหน้า</Text>
            </View>
          ) : (
            <View style={styles.freeTag}>
              <Text style={styles.freeTagText}>✅ ใช้งานได้เลย</Text>
            </View>
          )}
          <Text style={styles.viewMore}>ดูรายละเอียด →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => {
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>ไม่สามารถโหลดข้อมูลได้</Text>
          <Text style={styles.emptyText}>กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchData} accessibilityLabel="ลองใหม่" accessibilityRole="button">
            <Text style={styles.retryBtnText}>ลองใหม่</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <FacilityIcon size={48} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>ยังไม่มีสิ่งอำนวยความสะดวก</Text>
        <Text style={styles.emptyText}>ข้อมูลจะแสดงเมื่อนิติบุคคลเพิ่มสิ่งอำนวยความสะดวก</Text>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={facilities}
        keyExtractor={(item) => item.id}
        renderItem={renderFacility}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
        ListEmptyComponent={renderEmpty}
      />
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('BookingHistory')}
        accessibilityLabel="ประวัติการจอง"
        accessibilityRole="button"
      >
        <Text style={styles.fabText}>📋 ประวัติการจอง</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  list: { padding: spacing.lg, paddingBottom: 80 },
  card: {
    backgroundColor: colors.card, borderRadius: radius.md, marginBottom: 14,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, overflow: 'hidden',
  },
  cardImage: { width: '100%', height: 150, backgroundColor: colors.border },
  cardBody: { padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  facilityName: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  available: { backgroundColor: colors.successLight },
  unavailable: { backgroundColor: colors.dangerLight },
  badgeText: { fontSize: 12, fontWeight: '600' },
  type: { fontSize: 12, color: colors.textSecondary, marginTop: 4, textTransform: 'capitalize' },
  hours: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  desc: { fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 19 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  bookTag: { backgroundColor: colors.warningLight, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  bookTagText: { fontSize: 12, fontWeight: '600', color: '#92400E' },
  freeTag: { backgroundColor: colors.successLight, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  freeTagText: { fontSize: 12, fontWeight: '600', color: '#065F46' },
  viewMore: { fontSize: 13, color: colors.accent, fontWeight: '600' },
  // Empty state
  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 12, marginBottom: 6 },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    backgroundColor: colors.accent, borderRadius: radius.sm,
    paddingHorizontal: 24, paddingVertical: 10, marginTop: 16,
  },
  retryBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  // FAB
  fab: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    backgroundColor: colors.primary, borderRadius: 24, paddingVertical: 12, paddingHorizontal: 24,
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  fabText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});

export default FacilityScreen;
