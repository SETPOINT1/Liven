import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { supabase } from '../services/supabase';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import FacilityScreen from '../screens/FacilityScreen';
import ParcelScreen from '../screens/ParcelScreen';
import SocialFeedScreen from '../screens/SocialFeedScreen';
import ChatbotScreen from '../screens/ChatbotScreen';

const Tabs = createBottomTabNavigator({
  screenOptions: {
    headerShown: true,
    tabBarActiveTintColor: '#4F46E5',
    tabBarInactiveTintColor: '#9CA3AF',
    tabBarStyle: { paddingBottom: 4, height: 56 },
  },
  screens: {
    Home: { screen: HomeScreen, options: { title: 'หน้าหลัก' } },
    Facility: { screen: FacilityScreen, options: { title: 'Facility' } },
    Parcel: { screen: ParcelScreen, options: { title: 'พัสดุ' } },
    Social: { screen: SocialFeedScreen, options: { title: 'ฟีด' } },
    Chatbot: { screen: ChatbotScreen, options: { title: 'แชทบอท' } },
  },
});

const Navigation = createStaticNavigation(Tabs);

const AppNavigator = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription?.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!session) {
    return <LoginScreen onLogin={setSession} />;
  }

  return <Navigation />;
};

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default AppNavigator;
