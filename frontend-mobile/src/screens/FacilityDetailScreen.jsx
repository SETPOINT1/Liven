import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import api from '../services/api';
import { supabase } from '../services/supabase';
import { colors, radius, spacing } from '../theme';
import { ClockIcon, CheckCircleIcon } from '../components/TabIcons';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800';

const FacilityDetailScreen = ({ route }) => {
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
    for (let i = 0; i < 3; i++) {
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

  useEffect(() => {
    const channel = supabase
      .channel('bookings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchSlots(selectedDate))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedDate, fetchSlots]);

  const handleBook = async () => {
    if (!selectedSlot) { Alert.alert('กรุณาเลือกรอบเวลา'); return; }
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
        || 'ไม่สามารถจองได้ กรุณาลองใหม่';
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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
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
            <Text style={[styles.statusText, { color: facility.is_active ? '#065F46' : '#991B1B' }]}>
              {facility.is_active ? 'เปิดให้บริการ' : 'ปิดปรับปรุง'}
            </Text>
          </View>
        </View>

        {facility.operating_hours ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}><ClockIcon size={14} color={colors.textSecondary} /><Text style={styles.hours}> เวลาเปิด-ปิด: {facility.operating_hours}</Text></View>
        ) : null}

        {facility.description ? (
          <Text style={styles.description}>{facility.description}</Text>
        ) : null}

        {!facility.requires_booking ? (
          <View style={styles.noBookingBox}>
            <CheckCircleIcon size={28} color="#065F46" />
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
                    accessibilityLabel={`วันที่ ${date} ${day}`}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.dateDay, isSelected && styles.dateDaySelected]}>{day}</Text>
                    <Text style={[styles.dateNum, isSelected && styles.dateNumSelected]}>{date}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>เลือกรอบเวลา</Text>
            {loading ? (
              <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 16 }} />
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
                      accessibilityLabel={`${formatTime(slot.start_time)} ถึง ${formatTime(slot.end_time)} ${slot.is_available ? 'ว่าง' : 'จองแล้ว'}`}
                      accessibilityRole="button"
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
              <View style={styles.selectedInfo}>
                <Text style={styles.selectedText}>
                  เลือก: {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>

    {/* Sticky book button */}
    {selectedSlot && (
      <View style={styles.stickyBar}>
        <TouchableOpacity
          style={[styles.bookBtn, booking && { opacity: 0.6 }]}
          onPress={handleBook} disabled={booking}
          accessibilityLabel="ยืนยันจอง" accessibilityRole="button"
        >
          {booking ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.bookBtnText}>
              ยืนยันจอง {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  heroImage: { width: '100%', height: 180, backgroundColor: colors.border },
  content: { padding: spacing.xl },
  name: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  typeBadge: {
    backgroundColor: colors.accentLight, color: colors.accent,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    fontSize: 12, fontWeight: '600', textTransform: 'capitalize', overflow: 'hidden',
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  active: { backgroundColor: colors.successLight },
  inactive: { backgroundColor: colors.dangerLight },
  statusText: { fontSize: 12, fontWeight: '600' },
  hours: { fontSize: 14, color: colors.textSecondary, marginBottom: 8 },
  description: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, marginBottom: 16 },
  noBookingBox: { backgroundColor: colors.successLight, borderRadius: radius.md, padding: 20, alignItems: 'center', marginTop: 8 },
  noBookingIcon: { fontSize: 28, marginBottom: 8 },
  noBookingText: { fontSize: 15, fontWeight: '600', color: '#065F46' },
  bookingSection: { marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  dateRow: { marginBottom: 20 },
  dateChip: {
    width: 52, height: 64, borderRadius: radius.md, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
    borderWidth: 1.5, borderColor: colors.border,
  },
  dateChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateDay: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  dateDaySelected: { color: 'rgba(255,255,255,0.7)' },
  dateNum: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 2 },
  dateNumSelected: { color: '#FFF' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.sm,
    backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border,
    minWidth: 100, alignItems: 'center',
  },
  slotUnavailable: { backgroundColor: colors.bg, borderColor: colors.border },
  slotSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotText: { fontSize: 13, fontWeight: '600', color: colors.text },
  slotTextUnavailable: { color: colors.textMuted },
  slotTextSelected: { color: '#FFF' },
  slotBooked: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  emptySlots: { color: colors.textMuted, textAlign: 'center', marginTop: 16 },
  selectedInfo: { backgroundColor: colors.accentLight, borderRadius: radius.sm, padding: 10, marginTop: 12, alignItems: 'center' },
  selectedText: { fontSize: 13, fontWeight: '600', color: colors.accent },
  stickyBar: {
    backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 0.5, borderTopColor: colors.border,
  },
  bookBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    padding: 16, alignItems: 'center',
  },
  bookBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});

export default FacilityDetailScreen;
