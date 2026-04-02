import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import QuickMenu from '../components/widgets/QuickMenu';
import ParcelWidget from '../components/widgets/ParcelWidget';
import EventWidget from '../components/widgets/EventWidget';
import AnnouncementWidget from '../components/widgets/AnnouncementWidget';
import FacilityWidget from '../components/widgets/FacilityWidget';
import api from '../services/api';
import { colors, radius, spacing } from '../theme';
import { getLogoutHandler } from '../navigation/AppNavigator';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [userName, setUserName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [parcels, setParcels] = useState(null);
  const [events, setEvents] = useState(null);
  const [announcements, setAnnouncements] = useState(null);
  const [facilities, setFacilities] = useState(null);

  const fetchAll = useCallback(async () => {
    const results = await Promise.allSettled([
      api.get('/auth/me/'),
      api.get('/parcels/'),
      api.get('/events/'),
      api.get('/announcements/'),
      api.get('/facilities/'),
    ]);
    if (results[0].status === 'fulfilled') {
      const d = results[0].value.data;
      setUserName(d.full_name || '');
      setProjectName(d.project_name || 'Liven Community');
    } else { setProjectName('Liven Community'); }
    if (results[1].status === 'fulfilled') setParcels(results[1].value.data.results || results[1].value.data || []);
    if (results[2].status === 'fulfilled') setEvents(results[2].value.data.results || results[2].value.data || []);
    if (results[3].status === 'fulfilled') setAnnouncements(results[3].value.data.results || results[3].value.data || []);
    if (results[4].status === 'fulfilled') setFacilities(results[4].value.data.results || results[4].value.data || []);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const handleLogout = getLogoutHandler();
  const greeting = userName ? `สวัสดี, ${userName}` : 'สวัสดี';
  const today = new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>

      {/* Hero header — layered navy look */}
      <View style={s.hero}>
        <View style={s.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.heroGreeting}>{greeting}</Text>
            <Text style={s.heroProject}>{projectName}</Text>
          </View>
          {handleLogout && (
            <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.7}
              accessibilityLabel="ออกจากระบบ" accessibilityRole="button">
              <Text style={s.logoutText}>ออก</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={s.heroDate}>{today}</Text>
      </View>

      <QuickMenu navigation={navigation} parcelCount={parcels ? parcels.filter(p => p.status === 'pending').length : 0} />
      <ParcelWidget data={parcels} onPress={() => navigation.navigate('Parcel')} />

      {/* Section divider */}
      <Text style={s.sectionLabel}>ข่าวสารและกิจกรรม</Text>
      <EventWidget data={events} onPress={() => navigation.navigate('News', { initialTab: 'กิจกรรม' })} />
      <AnnouncementWidget data={announcements} onPress={() => navigation.navigate('News', { initialTab: 'ประกาศ' })} />

      <Text style={s.sectionLabel}>สิ่งอำนวยความสะดวก</Text>
      <FacilityWidget data={facilities} navigation={navigation} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 32 },
  // Hero
  hero: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg, paddingBottom: 20, marginBottom: 16,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start' },
  heroGreeting: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  heroProject: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  heroDate: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 8 },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  logoutText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500' },
  // Section
  sectionLabel: {
    fontSize: 13, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.5, marginTop: 8, marginBottom: 8, marginHorizontal: spacing.lg,
  },
});
