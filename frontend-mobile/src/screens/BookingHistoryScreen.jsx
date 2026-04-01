import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import api from '../services/api';

const BookingHistoryScreen = () => {
  const [bookings, setBookings] = useState([]);
  const [facilities, setFacilities] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [bookingsRes, facilitiesRes] = await Promise.all([
        api.get('/bookings/'),
        api.get('/facilities/'),
      ]);
      const bookingList = bookingsRes.data.results || bookingsRes.data || [];
      const facilityList = facilitiesRes.data.results || facilitiesRes.data || [];

      const facilityMap = {};
      facilityList.forEach((f) => {
        facilityMap[f.id] = f.name;
      });
      setFacilities(facilityMap);
      setBookings(bookingList);
    } catch {
      // silent
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCancel = async (bookingId) => {
    Alert.alert('ยืนยันการยกเลิก', 'คุณต้องการยกเลิกการจองนี้หรือไม่?', [
      { text: 'ไม่', style: 'cancel' },
      {
        text: 'ยกเลิก',
        style: 'destructive',
        onPress: async () => {
          setCancellingId(bookingId);
          try {
            await api.post(`/bookings/${bookingId}/cancel/`);
            fetchData();
          } catch (err) {
            const msg = err.response?.data?.error?.message || 'ไม่สามารถยกเลิกได้';
            Alert.alert('ข้อผิดพลาด', msg);
          }
          setCancellingId(null);
        },
      },
    ]);
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const now = new Date();
  const upcoming = bookings.filter(
    (b) => new Date(b.start_time) > now && b.status === 'confirmed'
  );
  const past = bookings.filter(
    (b) => new Date(b.start_time) <= now || b.status === 'cancelled'
  );

  const sections = [];
  if (upcoming.length > 0) {
    sections.push({ title: 'กำลังจะมาถึง', data: upcoming });
  }
  if (past.length > 0) {
    sections.push({ title: 'ผ่านมาแล้ว', data: past });
  }

  const getStatusStyle = (s) => {
    if (s === 'confirmed') return { bg: '#D1FAE5', color: '#065F46', label: 'ยืนยันแล้ว' };
    return { bg: '#FEE2E2', color: '#991B1B', label: 'ยกเลิกแล้ว' };
  };

  const renderItem = ({ item }) => {
    const st = getStatusStyle(item.status);
    const isUpcoming = new Date(item.start_time) > now && item.status === 'confirmed';
    const isCancelling = cancellingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.facilityName} numberOfLines={1}>
            {facilities[item.facility_id] || 'สิ่งอำนวยความสะดวก'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
            <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>
        <Text style={styles.dateText}>📅 {formatDate(item.start_time)}</Text>
        <Text style={styles.timeText}>
          🕐 {formatTime(item.start_time)} - {formatTime(item.end_time)}
        </Text>
        {isUpcoming && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => handleCancel(item.id)}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.cancelBtnText}>ยกเลิก</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
        }
        ListEmptyComponent={<Text style={styles.emptyText}>ยังไม่มีประวัติการจอง</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  sectionHeader: {
    fontSize: 16, fontWeight: '700', color: '#1F2937',
    marginTop: 12, marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 14,
    marginBottom: 10, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  facilityName: { fontSize: 15, fontWeight: '700', color: '#1F2937', flex: 1, marginRight: 8 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  dateText: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  timeText: { fontSize: 13, color: '#6B7280' },
  cancelBtn: {
    backgroundColor: '#EF4444', borderRadius: 8, paddingVertical: 8,
    alignItems: 'center', marginTop: 10,
  },
  cancelBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
});

export default BookingHistoryScreen;
