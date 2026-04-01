import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import api from '../../services/api';
import { colors, radius } from '../../theme';
const facilityColors = ['#38A169', '#2B6CB0', '#D69E2E', '#805AD5', '#E53E3E', '#DD6B20'];
export default function FacilityWidget({ onPress }) {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try { const res = await api.get('/facilities/'); setFacilities((res.data.results || res.data || []).slice(0, 4)); } catch {}
      setLoading(false);
    })();
  }, []);
  return (
    <View style={s.container}>
      <Text style={s.title}>สถานะสิ่งอำนวยความสะดวก</Text>
      {loading ? <Text style={s.muted}>กำลังโหลด...</Text> : facilities.length === 0 ? <Text style={s.muted}>ไม่มีข้อมูล</Text> : (
        <View style={s.grid}>
          {facilities.map((f, i) => {
            const c = facilityColors[i % facilityColors.length];
            return (
              <TouchableOpacity key={f.id} style={s.card} onPress={onPress} activeOpacity={0.7}>
                <View style={[s.iconCircle, { backgroundColor: c + '18' }]}>
                  <Text style={[s.iconText, { color: c }]}>{(f.name || '?')[0]}</Text>
                </View>
                <Text style={s.name} numberOfLines={1}>{f.name}</Text>
                <Text style={[s.status, { color: f.is_active ? colors.success : colors.textMuted }]}>{f.is_active ? 'ว่าง' : 'ปิดบริการ'}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  container: { marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, width: '48%', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  iconCircle: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  iconText: { fontSize: 18, fontWeight: '700' },
  name: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 },
  status: { fontSize: 12, fontWeight: '500' },
  muted: { color: colors.textMuted, fontSize: 13 },
});
