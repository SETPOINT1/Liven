import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import api from '../services/api';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800';

const FacilityDetailScreen = ({ route, navigation }) => {
  const { facility } = route.params;
  const [slots, setSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dates, setDates] = useState([]);

  useEffect(() => {
    const d = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      d.push(date.toISOString().split('T')[0]);
    }
    setDates(d);
    setSelectedDate(d[0]);
  }, []);

  const fetchSlots = useCallback(async (date) => {
    if (!facility.requires_booking || !date) return;
    setLoading(true);
    setSelectedSlot(null);
    try {
      const res = await api.get(`/facilities/${facility.id}/slots/`, { params: { date } });
      setSlots(res.data.slots || []);
    } catch {
      setSlots([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [facility]);

  useEffect(() => {
    if (selectedDate) fetchSlots(selectedDate);
  }, [selectedDate, fetchSlots]);

  const handleBook = async () => {
    if (!selectedSlot) {
      Alert.alert('กรุณาเลือกรอบเวลา');
      return;
    }
    setBooking(true);
    try {
      await api.post(`/facilities/${facility.id}/book/`, {
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
      });
      Alert.alert('สำเร็จ', 'จองสำเร็จแล้ว');
      setSelectedSlot(null);
      fetchSlots(selectedDate);
    } catch (err) {
      const msg = err.response?.data?.error?.message
        || err.response?.data?.error?.details?.non_field_errors
        || 'ไม่สามารถจองได้';
      Alert.alert('ข้อผิดพลาด', typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    setBooking(false);
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr);
    const days = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    return { day: days[d.getDay()], date: d.getDate() };
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSlots(selectedDate); }} />
      }
    >
      <Image source={{ uri: facility.image_url || PLACEHOLDER_IMG }} style={styles.heroImage} />

      <View style={styles.content}>
        <Text style={styles.name}>{facility.name}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.typeBadge}>{facility.type}</Text>
          <View style={[styles.statusBadge, facility.is_active ? styles.active : styles.inactive]}>
            <Text style={styles.statusText}>{facility.is_active ? 'เปิดให้บริการ' : 'ปิดปรับปรุง'}</Text>
          </View>
        </View>

        {facility.operating_hours ? (
          <Text style={styles.hours}>🕐 เวลาเปิด-ปิด: {facility.operating_hours}</Text>
        ) : null}

        {facility.description ? (
          <Text style={styles.description}>{facility.description}</Text>
        ) : null}

        {!facility.requires_booking ? (
          <View style={styles.noBookingBox}>
            <Text style={styles.noBookingIcon}>✅</Text>
            <Text style={styles.noBookingText}>ใช้งานได้เลย ไม่ต้องจองล่วงหน้า</Text>
          </View>
        ) : (
          <View style={styles.bookingSection}>
            <Text style={styles.sectionTitle}>เลือกวันที่</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateRow}>
              {dates.map((d) => {
                const { day, date } = formatDateLabel(d);
                const isSelected = d === selectedDate;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                    onPress={() => setSelectedDate(d)}
                  >
                    <Text style={[styles.dateDay, isSelected && styles.dateDaySelected]}>{day}</Text>
                    <Text style={[styles.dateNum, isSelected && styles.dateNumSelected]}>{date}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>เลือกรอบเวลา</Text>
            {loading ? (
              <ActivityIndicator size="small" color="#4F46E5" style={{ marginTop: 16 }} />
            ) : slots.length === 0 ? (
              <Text style={styles.emptySlots}>ไม่มีรอบเวลาสำหรับวันนี้</Text>
            ) : (
              <View style={styles.slotsGrid}>
                {slots.map((slot, i) => {
                  const isSelected = selectedSlot?.start_time === slot.start_time;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.slotChip,
                        !slot.is_available && styles.slotUnavailable,
                        isSelected && styles.slotSelected,
                      ]}
                      disabled={!slot.is_available}
                      onPress={() => setSelectedSlot(slot)}
                    >
                      <Text style={[
                        styles.slotText,
                        !slot.is_available && styles.slotTextUnavailable,
                        isSelected && styles.slotTextSelected,
                      ]}>
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </Text>
                      {!slot.is_available && <Text style={styles.slotBooked}>จองแล้ว</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {selectedSlot && (
              <TouchableOpacity style={styles.bookBtn} onPress={handleBook} disabled={booking}>
                {booking ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.bookBtnText}>
                    ยืนยันจอง {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  heroImage: { width: '100%', height: 220, backgroundColor: '#E5E7EB' },
  content: { padding: 20 },
  name: { fontSize: 22, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  typeBadge: { backgroundColor: '#EEF2FF', color: '#4F46E5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 12, fontWeight: '600', textTransform: 'capitalize', overflow: 'hidden' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  active: { backgroundColor: '#D1FAE5' },
  inactive: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#1F2937' },
  hours: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  description: { fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 16 },
  noBookingBox: { backgroundColor: '#ECFDF5', borderRadius: 12, padding: 20, alignItems: 'center', marginTop: 8 },
  noBookingIcon: { fontSize: 28, marginBottom: 8 },
  noBookingText: { fontSize: 15, fontWeight: '600', color: '#065F46' },
  bookingSection: { marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  dateRow: { marginBottom: 20 },
  dateChip: { width: 52, height: 64, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', marginRight: 8, borderWidth: 1.5, borderColor: '#E5E7EB' },
  dateChipSelected: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  dateDay: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  dateDaySelected: { color: '#C7D2FE' },
  dateNum: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginTop: 2 },
  dateNumSelected: { color: '#FFF' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E5E7EB', minWidth: 100, alignItems: 'center' },
  slotUnavailable: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  slotSelected: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  slotText: { fontSize: 13, fontWeight: '600', color: '#1F2937' },
  slotTextUnavailable: { color: '#9CA3AF' },
  slotTextSelected: { color: '#FFF' },
  slotBooked: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  emptySlots: { color: '#9CA3AF', textAlign: 'center', marginTop: 16 },
  bookBtn: { backgroundColor: '#4F46E5', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20, marginBottom: 32 },
  bookBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});

export default FacilityDetailScreen;
