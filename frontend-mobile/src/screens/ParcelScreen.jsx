import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import api from '../services/api';
import { supabase } from '../services/supabase';

const ParcelScreen = () => {
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchParcels = useCallback(async () => {
    try {
      const res = await api.get('/parcels/');
      setParcels(res.data.results || res.data || []);
    } catch {
      // silent
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchParcels();
  }, [fetchParcels]);

  // Supabase Realtime subscription for new parcels
  useEffect(() => {
    const channel = supabase
      .channel('parcels-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parcels' }, () => {
        fetchParcels();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchParcels]);

  // Also subscribe to notifications for parcel alerts
  useEffect(() => {
    const channel = supabase
      .channel('parcel-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'type=eq.parcel' }, () => {
        fetchParcels();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchParcels]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderParcel = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>📦</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.recipient}>{item.recipient_name || 'ไม่ระบุชื่อ'}</Text>
          <Text style={styles.detail}>ห้อง: {item.unit_number || '-'}</Text>
          {item.courier ? <Text style={styles.detail}>ขนส่ง: {item.courier}</Text> : null}
          {item.tracking_number ? <Text style={styles.detail}>เลขพัสดุ: {item.tracking_number}</Text> : null}
          <Text style={styles.date}>มาถึง: {formatDate(item.arrived_at)}</Text>
          {item.picked_up_at ? <Text style={styles.date}>รับแล้ว: {formatDate(item.picked_up_at)}</Text> : null}
        </View>
      </View>
      <View style={[styles.statusBadge, item.status === 'picked_up' ? styles.pickedUp : styles.pending]}>
        <Text style={styles.statusText}>{item.status === 'picked_up' ? 'รับแล้ว' : 'รอรับ'}</Text>
      </View>
    </View>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={parcels}
        keyExtractor={(item) => item.id}
        renderItem={renderParcel}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchParcels(); }} />}
        ListEmptyComponent={<Text style={styles.emptyText}>ไม่มีพัสดุ</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  row: { flexDirection: 'row' },
  image: { width: 64, height: 64, borderRadius: 8, marginRight: 12 },
  imagePlaceholder: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  placeholderText: { fontSize: 28 },
  info: { flex: 1 },
  recipient: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  detail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  date: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, marginTop: 8 },
  pending: { backgroundColor: '#FEF3C7' },
  pickedUp: { backgroundColor: '#D1FAE5' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#1F2937' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
});

export default ParcelScreen;
