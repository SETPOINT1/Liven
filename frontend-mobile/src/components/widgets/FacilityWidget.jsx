import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, radius } from '../../theme';

const facilityColors = ['#38A169', '#2B6CB0', '#D69E2E', '#805AD5', '#E53E3E', '#DD6B20'];

export default function FacilityWidget({ data, navigation }) {
  const loading = data === null;
  const facilities = data ? data.slice(0, 4) : [];

  const handleFacilityPress = (facility) => {
    if (navigation) {
      navigation.navigate('Facility', { screen: 'FacilityDetail', params: { facility } });
    }
  };

  const handleViewAll = () => {
    if (navigation) {
      navigation.navigate('Facility', { screen: 'FacilityList' });
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>สถานะสิ่งอำนวยความสะดวก</Text>
        <TouchableOpacity onPress={handleViewAll} accessibilityLabel="ดูสิ่งอำนวยความสะดวกทั้งหมด" accessibilityRole="button">
          <Text style={s.link}>ดูทั้งหมด</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 12 }} />
      ) : facilities.length === 0 ? (
        <Text style={s.muted}>ไม่มีข้อมูล</Text>
      ) : (
        <View style={s.grid}>
          {facilities.map((f, i) => {
            const c = facilityColors[i % facilityColors.length];
            return (
              <TouchableOpacity key={f.id} style={s.card} onPress={() => handleFacilityPress(f)} activeOpacity={0.7}
                accessibilityLabel={`${f.name} - ${f.is_active ? 'เปิด' : 'ปิด'}`} accessibilityRole="button">
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
  container: { marginBottom: 12, marginHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  link: { fontSize: 13, color: colors.accent, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, width: '48%', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  iconCircle: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  iconText: { fontSize: 18, fontWeight: '700' },
  name: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 },
  status: { fontSize: 12, fontWeight: '500' },
  muted: { color: colors.textMuted, fontSize: 13 },
});
