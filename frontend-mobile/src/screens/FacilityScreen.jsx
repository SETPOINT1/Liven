import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert,
  Modal, ActivityIndicator, RefreshControl,
} from 'react-native';
import api from '../services/api';
import { supabase } from '../services/supabase';
import { colors, radius } from '../theme';

const FacilityScreen = () => {
  const [facilities, setFacilities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [facRes, bookRes] = await Promise.all([
        api.get('/facilities/'),
        api.get('/bookings/'),
      ]);
      setFacilities(facRes.data.results || facRes.data || []);
      setBookings(bookRes.data.results || bookRes.data || []);
    } catch {
      // silent
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Supabase Realtime subscription for bookings
  useEffect(() => {
    const channel = supabase
      .channel('bookings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const handleBook = async () => {
    if (!startTime || !endTime) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกเวลาเริ่มต้นและสิ้นสุด');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/facilities/${selectedFacility.id}/book/`, {
        start_time: startTime,
        end_time: endTime,
      });
      Alert.alert('สำเร็จ', 'จองสำเร็จแล้ว');
      setShowBooking(false);
      setStartTime('');
      setEndTime('');
      fetchData();
    } catch (err) {
      Alert.alert('ข้อผิดพลาด', err.response?.data?.detail || 'ไม่สามารถจองได้');
    }
    setSubmitting(false);
  };

  const renderFacility = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.facilityName}>{item.name}</Text>
        <View style={[styles.badge, item.is_active ? styles.available : styles.unavailable]}>
          <Text style={styles.badgeText}>{item.is_active ? 'ว่าง' : 'ไม่ว่าง'}</Text>
        </View>
      </View>
      <Text style={styles.type}>{item.type}</Text>
      {item.operating_hours ? <Text style={styles.hours}>⏰ {item.operating_hours}</Text> : null}
      {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
      <TouchableOpacity
        style={styles.bookBtn}
        onPress={() => { setSelectedFacility(item); setShowBooking(true); }}
      >
        <Text style={styles.bookBtnText}>จอง</Text>
      </TouchableOpacity>
    </View>
  );

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
        ListEmptyComponent={<Text style={styles.emptyText}>ไม่มีสิ่งอำนวยความสะดวก</Text>}
        ListFooterComponent={
          bookings.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>การจองของคุณ</Text>
              {bookings.map((b) => (
                <View key={b.id} style={styles.bookingCard}>
                  <Text style={styles.bookingName}>{b.facility_name || 'Facility'}</Text>
                  <Text style={styles.bookingTime}>{b.start_time} - {b.end_time}</Text>
                  <Text style={[styles.bookingStatus, b.status === 'cancelled' && { color: colors.danger }]}>{b.status}</Text>
                </View>
              ))}
            </View>
          ) : null
        }
      />

      <Modal visible={showBooking} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>จอง {selectedFacility?.name}</Text>
            <TextInput
              style={styles.input}
              placeholder="เวลาเริ่ม (YYYY-MM-DD HH:MM)"
              value={startTime}
              onChangeText={setStartTime}
            />
            <TextInput
              style={styles.input}
              placeholder="เวลาสิ้นสุด (YYYY-MM-DD HH:MM)"
              value={endTime}
              onChangeText={setEndTime}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowBooking(false)}>
                <Text style={styles.cancelBtnText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleBook} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmBtnText}>ยืนยัน</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  facilityName: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  available: { backgroundColor: colors.successLight },
  unavailable: { backgroundColor: colors.dangerLight },
  badgeText: { fontSize: 12, fontWeight: '600' },
  type: { fontSize: 13, color: colors.textSecondary, marginTop: 4, textTransform: 'capitalize' },
  hours: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  desc: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  bookBtn: { backgroundColor: colors.primary, borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 10 },
  bookBtnText: { color: '#FFF', fontWeight: '600' },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  bookingCard: { backgroundColor: '#FFF', borderRadius: 8, padding: 12, marginBottom: 8 },
  bookingName: { fontWeight: '600', color: colors.text },
  bookingTime: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  bookingStatus: { fontSize: 12, color: colors.success, marginTop: 2, textTransform: 'capitalize' },
  emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 15 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cancelBtn: { flex: 1, padding: 12, alignItems: 'center', marginRight: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '600' },
  confirmBtn: { flex: 1, padding: 12, alignItems: 'center', marginLeft: 8, borderRadius: 8, backgroundColor: colors.primary },
  confirmBtnText: { color: '#FFF', fontWeight: '600' },
});

export default FacilityScreen;



