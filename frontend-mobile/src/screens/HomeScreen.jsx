import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import QuickMenu from '../components/widgets/QuickMenu';
import ParcelWidget from '../components/widgets/ParcelWidget';
import EventWidget from '../components/widgets/EventWidget';
import AnnouncementWidget from '../components/widgets/AnnouncementWidget';
import FacilityWidget from '../components/widgets/FacilityWidget';
import api from '../services/api';
import { colors, radius } from '../theme';
export default function HomeScreen() {
  const navigation = useNavigation();
  const [userName, setUserName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [parcelCount, setParcelCount] = useState(0);
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/auth/me/');
        setUserName(res.data.full_name || '');
        setProjectName(res.data.project_name || 'Liven Community');
      } catch {}
    })();
  }, []);
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/parcels/');
        const parcels = res.data.results || res.data || [];
        setParcelCount(parcels.filter(p => p.status === 'pending').length);
      } catch {}
    })();
  }, [refreshKey]);
  const onRefresh = () => { setRefreshing(true); setRefreshKey(k => k + 1); setTimeout(() => setRefreshing(false), 1000); };
  const today = new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>
      <Text style={s.greeting}>สวัสดี, คุณ{userName || 'ลูกบ้าน'}</Text>
      <Text style={s.sub}>ยินดีต้อนรับสู่ Liven - ระบบจัดการชุมชนอัจฉริยะ</Text>
      <View style={s.projectCard}>
        <Text style={s.projectName}>{projectName}</Text>
        <Text style={s.projectDate}>{today}</Text>
      </View>
      <QuickMenu key={'qm-'+refreshKey} navigation={navigation} parcelCount={parcelCount} />
      <ParcelWidget key={'pw-'+refreshKey} onPress={() => navigation.navigate('Parcel')} />
      <EventWidget key={'ew-'+refreshKey} onPress={() => navigation.navigate('News')} navigation={navigation} />
      <AnnouncementWidget key={'aw-'+refreshKey} onPress={() => navigation.navigate('News')} />
      <FacilityWidget key={'fw-'+refreshKey} onPress={() => navigation.navigate('News')} />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  greeting: { fontSize: 22, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted, marginBottom: 16 },
  projectCard: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 20, marginBottom: 14 },
  projectName: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  projectDate: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
});
