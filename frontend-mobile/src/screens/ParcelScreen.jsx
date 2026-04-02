import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import api from '../services/api';
import { supabase } from '../services/supabase';

import { colors, radius } from '../theme';

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
            <Text style={styles.placeholderText}>P</Text>
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

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📦</Text>
      <Text style={styles.emptyTitle}>ไม่มีพัสดุ</Text>
      <Text style={styles.emptyDesc}>เมื่อมีพัสดุมาถึง จะแสดงที่นี่</Text>
    </View>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={parcels}
        keyExtractor={(item) => item.id}
        renderItem={renderParcel}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchParcels(); }} />}
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  list: { padding: 16 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  row: { flexDirection: 'row' },
  image: { width: 64, height: 64, borderRadius: 8, marginRight: 12 },
  imagePlaceholder: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  placeholderText: { fontSize: 20, fontWeight: '700', color: colors.textMuted },
  info: { flex: 1 },
  recipient: { fontSize: 15, fontWeight: '700', color: colors.text },
  detail: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  date: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, marginTop: 8 },
  pending: { backgroundColor: colors.warningLight },
  pickedUp: { backgroundColor: colors.successLight },
  statusText: { fontSize: 12, fontWeight: '600', color: colors.text },
  // Empty state
  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
});

export default ParcelScreen;
