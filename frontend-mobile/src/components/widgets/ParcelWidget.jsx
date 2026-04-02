import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radius } from '../../theme';
import { ParcelIcon } from '../TabIcons';

export default function ParcelWidget({ data, onPress }) {
  const loading = data === null;
  const parcels = data || [];
  const pendingCount = parcels.filter(p => p.status === 'pending').length;

  return (
    <TouchableOpacity style={s.container} onPress={onPress} activeOpacity={0.7}
      accessibilityLabel={`พัสดุรอรับ ${pendingCount} ชิ้น`} accessibilityRole="button">
      <View style={s.left}>
        <View style={s.iconWrap}>
          <ParcelIcon size={22} color={colors.warning} />
        </View>
        <View>
          <Text style={s.title}>พัสดุของฉัน</Text>
          {loading ? (
            <Text style={s.sub}>กำลังโหลด...</Text>
          ) : pendingCount > 0 ? (
            <Text style={s.subHighlight}>{pendingCount} ชิ้นรอรับ</Text>
          ) : (
            <Text style={s.sub}>ไม่มีพัสดุรอรับ</Text>
          )}
        </View>
      </View>
      <Text style={s.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: colors.card, borderRadius: radius.md, padding: 16,
    marginBottom: 12, marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconWrap: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: colors.warningLight,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  subHighlight: { fontSize: 13, color: colors.warning, fontWeight: '600', marginTop: 1 },
  arrow: { fontSize: 22, color: colors.textMuted, fontWeight: '300' },
});
