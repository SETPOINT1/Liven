import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { supabase } from '../services/supabase';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400';

const FacilityScreen = () => {
  const navigation = useNavigation();
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/facilities/');
      setFacilities(res.data.results || res.data || []);
    } catch {
      // silent
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
    >
      <Image
        source={{ uri: item.image_url || PLACEHOLDER_IMG }}
        style={styles.cardImage}
      />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.facilityName} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.badge, item.is_active ? styles.available : styles.unavailable]}>
            <Text style={styles.badgeText}>{item.is_active ? 'เปิด' : 'ปิด'}</Text>
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

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={facilities}
        keyExtractor={(item) => item.id}
        renderItem={renderFacility}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
        ListEmptyComponent={<Text style={styles.emptyText}>ไม่มีสิ่งอำนวยความสะดวก</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, overflow: 'hidden' },
  cardImage: { width: '100%', height: 150, backgroundColor: '#E5E7EB' },
  cardBody: { padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  facilityName: { fontSize: 16, fontWeight: '700', color: '#1F2937', flex: 1, marginRight: 8 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  available: { backgroundColor: '#D1FAE5' },
  unavailable: { backgroundColor: '#FEE2E2' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  type: { fontSize: 12, color: '#6B7280', marginTop: 4, textTransform: 'capitalize' },
  hours: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  desc: { fontSize: 13, color: '#6B7280', marginTop: 4, lineHeight: 19 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  bookTag: { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  bookTagText: { fontSize: 12, fontWeight: '600', color: '#92400E' },
  freeTag: { backgroundColor: '#ECFDF5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  freeTagText: { fontSize: 12, fontWeight: '600', color: '#065F46' },
  viewMore: { fontSize: 13, color: '#4F46E5', fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
});

export default FacilityScreen;
