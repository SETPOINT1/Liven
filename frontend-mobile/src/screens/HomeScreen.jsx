import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import FacilityWidget from '../components/widgets/FacilityWidget';
import ParcelWidget from '../components/widgets/ParcelWidget';
import NewsWidget from '../components/widgets/NewsWidget';
import FeedWidget from '../components/widgets/FeedWidget';
import api from '../services/api';

const HomeScreen = ({ navigation }) => {
  const [userName, setUserName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [recommendation, setRecommendation] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me/');
        setUserName(res.data.full_name || '');
      } catch {
        // silent
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchRecommendation = async () => {
      try {
        const res = await api.get('/bookings/');
        const bookings = res.data.results || res.data || [];
        if (bookings.length > 0) {
          // Find most frequently booked facility
          const counts = {};
          bookings.forEach((b) => {
            const name = b.facility_name || b.facility_id;
            counts[name] = (counts[name] || 0) + 1;
          });
          const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
          if (top) setRecommendation(`คุณใช้ ${top[0]} บ่อยที่สุด`);
        }
      } catch {
        // silent
      }
    };
    fetchRecommendation();
  }, [refreshKey]);

  const onRefresh = () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.greeting}>สวัสดี, {userName || 'ลูกบ้าน'} 👋</Text>

      {recommendation ? (
        <View style={styles.recBox}>
          <Text style={styles.recText}>💡 {recommendation}</Text>
        </View>
      ) : null}

      <FacilityWidget key={`fac-${refreshKey}`} onPress={() => navigation.navigate('Facility')} />
      <ParcelWidget key={`par-${refreshKey}`} onPress={() => navigation.navigate('Parcel')} />
      <NewsWidget key={`news-${refreshKey}`} onPress={() => navigation.navigate('Social')} />
      <FeedWidget key={`feed-${refreshKey}`} onPress={() => navigation.navigate('Social')} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { padding: 16 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  recBox: { backgroundColor: '#EEF2FF', borderRadius: 8, padding: 10, marginBottom: 12, marginTop: 8 },
  recText: { color: '#4338CA', fontSize: 13 },
});

export default HomeScreen;
