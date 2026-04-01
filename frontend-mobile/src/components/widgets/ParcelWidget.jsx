import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import api from '../../services/api';
import { colors, radius } from '../../theme';
export default function ParcelWidget({ onPress }) {
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchParcels(); }, []);
  const fetchParcels = async () => {
    try { const res = await api.get('/parcels/'); setParcels(res.data.results || res.data || []); } catch {}
    setLoading(false);
  };
  const pending = parcels.filter(p => p.status === 'pending');
  const latest = pending[0];
  const history = parcels.slice(0, 3);
  const handlePickup = async (id) => {
    try { await api.patch('/parcels/' + id + '/pickup/'); Alert.alert('สำเร็จ', 'ยืนยันรับพัสดุแล้ว'); fetchParcels(); }
    catch { Alert.alert('ผิดพลาด', 'ไม่สามารถยืนยันได้'); }
  };
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>พัสดุของฉัน</Text>
        <TouchableOpacity onPress={onPress}><Text style={s.link}>ดูทั้งหมด</Text></TouchableOpacity>
      </View>
      {loading ? <Text style={s.muted}>กำลังโหลด...</Text> : !latest ? <Text style={s.muted}>ไม่มีพัสดุรอรับ</Text> : (
        <View style={s.card}>
          <View style={s.statusRow}>
            <View style={s.statusDot} /><Text style={s.statusText}>พร้อมรับ</Text>
            <Text style={s.trackNum}>{latest.tracking_number || '-'}</Text>
          </View>
          <Text style={s.detail}>{fmtDate(latest.arrived_at)} {latest.unit_number ? '• ห้อง ' + latest.unit_number : ''}</Text>
          {latest.courier ? <Text style={s.detail}>{latest.courier}</Text> : null}
          <TouchableOpacity style={s.pickupBtn} onPress={() => handlePickup(latest.id)} activeOpacity={0.7}>
            <Text style={s.pickupBtnText}>ยืนยันรับพัสดุ</Text>
          </TouchableOpacity>
        </View>
      )}
      {history.length > 0 && (
        <View style={s.historyBox}>
          <Text style={s.historyTitle}>ประวัติล่าสุด</Text>
          {history.map((p) => (
            <View key={p.id} style={s.historyRow}>
              <View style={[s.historyDot, { backgroundColor: p.status === 'picked_up' ? colors.success : colors.warning }]} />
              <Text style={s.historyText} numberOfLines={1}>{p.tracking_number || p.recipient_name || '-'}</Text>
              <Text style={s.historyDate}>{fmtDate(p.arrived_at)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  container: { marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  link: { fontSize: 13, color: colors.accent, fontWeight: '500' },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, marginBottom: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success, marginRight: 6 },
  statusText: { fontSize: 14, fontWeight: '600', color: colors.success, flex: 1 },
  trackNum: { fontSize: 12, color: colors.textMuted, fontFamily: 'monospace' },
  detail: { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
  pickupBtn: { backgroundColor: colors.success, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  pickupBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  historyBox: { backgroundColor: colors.card, borderRadius: radius.sm, padding: 12 },
  historyTitle: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  historyDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  historyText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  historyDate: { fontSize: 11, color: colors.textMuted },
  muted: { color: colors.textMuted, fontSize: 13 },
});
