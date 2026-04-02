import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { colors, radius } from '../../theme';

const facilityColors = ['#2B6CB0', '#38A169', '#D69E2E', '#805AD5', '#E53E3E', '#DD6B20'];

export default function FacilityWidget({ data, navigation }) {
  const loading = data === null;
  const facilities = data ? data.slice(0, 6) : [];

  const handleFacilityPress = (facility) => {
    if (navigation) navigation.navigate('Facility', { screen: 'FacilityDetail', params: { facility } });
  };
  const handleViewAll = () => {
    if (navigation) navigation.navigate('Facility', { screen: 'FacilityList' });
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>สิ่งอำนวยความสะดวก</Text>
        <TouchableOpacity onPress={handleViewAll} accessibilityLabel="ดูทั้งหมด" accessibilityRole="button">
          <Text style={s.link}>ดูทั้งหมด ›</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 12 }} />
      ) : facilities.length === 0 ? (
        <Text style={s.muted}>ไม่มีข้อมูล</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.scroll}>
          {facilities.map((f, i) => {
            const c = facilityColors[i % facilityColors.length];
            return (
              <TouchableOpacity key={f.id} style={s.card} onPress={() => handleFacilityPress(f)} activeOpacity={0.7}
                accessibilityLabel={`${f.name} - ${f.is_active ? 'เปิด' : 'ปิด'}`} accessibilityRole="button">
                <View style={[s.iconCircle, { backgroundColor: c + '15' }]}>
                  <Text style={[s.iconText, { color: c }]}>{(f.name || '?')[0]}</Text>
                </View>
                <Text style={s.name} numberOfLines={1}>{f.name}</Text>
                <View style={[s.statusDot, { backgroundColor: f.is_active ? colors.success : colors.textMuted }]} />
                <Text style={[s.status, { color: f.is_active ? colors.success : colors.textMuted }]}>
                  {f.is_active ? 'เปิด' : 'ปิด'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginBottom: 16, marginLeft: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginRight: 16 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  link: { fontSize: 13, color: colors.accent, fontWeight: '500' },
  scroll: { paddingRight: 16 },
  card: {
    backgroundColor: colors.card, borderRadius: radius.md, padding: 14, width: 110,
    alignItems: 'center', marginRight: 10,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  iconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  iconText: { fontSize: 18, fontWeight: '700' },
  name: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6, textAlign: 'center' },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 2 },
  status: { fontSize: 11, fontWeight: '500' },
  muted: { color: colors.textMuted, fontSize: 13, marginRight: 16 },
});
