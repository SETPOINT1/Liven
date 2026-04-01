import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { supabase } from '../services/supabase';
import api from '../services/api';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import NewsScreen from '../screens/NewsScreen';
import ParcelScreen from '../screens/ParcelScreen';
import SocialFeedScreen from '../screens/SocialFeedScreen';
import ChatbotScreen from '../screens/ChatbotScreen';
import FacilityScreen from '../screens/FacilityScreen';

const Tabs = createBottomTabNavigator({
  screenOptions: {
    headerShown: true,
    tabBarActiveTintColor: '#4F46E5',
    tabBarInactiveTintColor: '#9CA3AF',
    tabBarStyle: { paddingBottom: 4, height: 56 },
  },
  screens: {
    Home: { screen: HomeScreen, options: { title: 'หน้าหลัก' } },
    Facility: { screen: FacilityScreen, options: { title: 'จองส่วนกลาง' } },
    News: { screen: NewsScreen, options: { title: 'ข่าวสาร' } },
    Parcel: { screen: ParcelScreen, options: { title: 'พัสดุ' } },
    Social: { screen: SocialFeedScreen, options: { title: 'ฟีด' } },
    Chatbot: { screen: ChatbotScreen, options: { title: 'แชทบอท' } },
  },
});

const Navigation = createStaticNavigation(Tabs);

const AppNavigator = () => {
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!s) {
        setApproved(false);
      }
    });
    return () => subscription?.unsubscribe();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }
    // Verify user is approved
    try {
      const res = await api.get('/auth/me/');
      if (res.data.status === 'approved') {
        setApproved(true);
      }
    } catch {
      // Not approved or error
    }
    setLoading(false);
  }

  function handleLogin() {
    setApproved(true);
  }

  function handleLogout() {
    supabase.auth.signOut();
    setApproved(false);
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!approved) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <Navigation />;
};

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default AppNavigator;
