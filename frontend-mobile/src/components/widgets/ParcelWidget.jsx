import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import api from '../../services/api';

const ParcelWidget = ({ onPress }) => {
  const [stats, setStats] = useState({ pending: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParcels = async () => {
      try {
        const res = await api.get('/parcels/');
        const parcels = res.data.results || res.data || [];
        const pending = parcels.filter((p) => p.status === 'pending').length;
        setStats({ pending, total: parcels.length });
      } catch {
        // silent
      }
      setLoading(false);
    };
    fetchParcels();
  }, []);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.title}>📦 พัสดุ</Text>
      {loading ? (
        <Text style={styles.loadingText}>กำลังโหลด...</Text>
      ) : (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{stats.pending}</Text>
            <Text style={styles.statLabel}>รอรับ</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>ทั้งหมด</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  title: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 10 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: '700', color: '#4F46E5' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  loadingText: { color: '#9CA3AF', fontSize: 13 },
});

export default ParcelWidget;
