import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import api from '../../services/api';

const FacilityWidget = ({ onPress }) => {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const res = await api.get('/facilities/');
        setFacilities((res.data.results || res.data || []).slice(0, 4));
      } catch {
        // silent
      }
      setLoading(false);
    };
    fetchFacilities();
  }, []);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.title}>🏋️ สิ่งอำนวยความสะดวก</Text>
      {loading ? (
        <Text style={styles.loadingText}>กำลังโหลด...</Text>
      ) : facilities.length === 0 ? (
        <Text style={styles.emptyText}>ไม่มีข้อมูล</Text>
      ) : (
        facilities.map((f) => (
          <View key={f.id} style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>{f.name}</Text>
            <View style={[styles.badge, f.is_active ? styles.available : styles.unavailable]}>
              <Text style={styles.badgeText}>{f.is_active ? 'ว่าง' : 'ไม่ว่าง'}</Text>
            </View>
          </View>
        ))
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  title: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  name: { fontSize: 14, color: '#374151', flex: 1 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2 },
  available: { backgroundColor: '#D1FAE5' },
  unavailable: { backgroundColor: '#FEE2E2' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  loadingText: { color: '#9CA3AF', fontSize: 13 },
  emptyText: { color: '#9CA3AF', fontSize: 13 },
});

export default FacilityWidget;
