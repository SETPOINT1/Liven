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

  // Centralized data — fetch once, pass to widgets
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
    } else {
      setProjectName('Liven Community');
    }

    if (results[1].status === 'fulfilled') {
      const d = results[1].value.data;
      setParcels(d.results || d || []);
    }
    if (results[2].status === 'fulfilled') {
      const d = results[2].value.data;
      setEvents(d.results || d || []);
    }
    if (results[3].status === 'fulfilled') {
      const d = results[3].value.data;
      setAnnouncements(d.results || d || []);
    }
    if (results[4].status === 'fulfilled') {
      const d = results[4].value.data;
      setFacilities(d.results || d || []);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const parcelCount = parcels ? parcels.filter(p => p.status === 'pending').length : 0;

  const today = new Date().toLocaleDateString('th-TH', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const handleLogout = getLogoutHandler();

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <View style={s.projectCard}>
        <View style={s.projectHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.projectName}>{projectName}</Text>
            <Text style={s.projectDate}>{today}</Text>
          </View>
          {handleLogout && (
            <TouchableOpacity
              style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.7}
              accessibilityLabel="ออกจากระบบ" accessibilityRole="button"
            >
              <Text style={s.logoutText}>ออกจากระบบ</Text>
            </TouchableOpacity>
          )}
        </View>
        {userName ? <Text style={s.greeting}>สวัสดี, {userName}</Text> : null}
      </View>

      <QuickMenu navigation={navigation} parcelCount={parcelCount} />
      <ParcelWidget data={parcels} onPress={() => navigation.navigate('Parcel')} onRefresh={fetchAll} />
      <EventWidget data={events} onPress={() => navigation.navigate('News', { initialTab: 'กิจกรรม' })} />
      <AnnouncementWidget data={announcements} onPress={() => navigation.navigate('News', { initialTab: 'ประกาศ' })} />
      <FacilityWidget data={facilities} navigation={navigation} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 32 },
  projectCard: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    padding: spacing.lg, marginBottom: 14,
  },
  projectHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  projectName: { fontSize: 17, fontWeight: '700', color: '#FFF', marginBottom: 2 },
  projectDate: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.sm,
    paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8,
  },
  logoutText: { color: '#FFF', fontSize: 12, fontWeight: '500' },
});
