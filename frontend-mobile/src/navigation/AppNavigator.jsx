import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, View, StyleSheet, Platform, Alert } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from '../services/supabase';
import api from '../services/api';
import { colors } from '../theme';
import { HomeIcon, FacilityIcon, ParcelIcon, SocialIcon, ChatbotIcon } from '../components/TabIcons';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import NewsScreen from '../screens/NewsScreen';
import ParcelScreen from '../screens/ParcelScreen';
import SocialFeedScreen from '../screens/SocialFeedScreen';
import ChatbotScreen from '../screens/ChatbotScreen';
import FacilityScreen from '../screens/FacilityScreen';
import FacilityDetailScreen from '../screens/FacilityDetailScreen';
import BookingHistoryScreen from '../screens/BookingHistoryScreen';

// Shared stack header style — navy header with white text
const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: '#FFF',
  headerTitleStyle: { fontWeight: '600', fontSize: 16 },
};

// --- Stacks for each tab ---
// Every tab gets its own stack so it has a proper header + safe area

const HomeStack = createNativeStackNavigator({
  screenOptions: stackScreenOptions,
  screens: {
    HomeMain: {
      screen: HomeScreen,
      options: { title: 'หน้าหลัก' },
    },
    News: {
      screen: NewsScreen,
      options: { title: 'ข่าวสาร' },
    },
  },
});

const FacilityStack = createNativeStackNavigator({
  screenOptions: stackScreenOptions,
  screens: {
    FacilityList: {
      screen: FacilityScreen,
      options: { title: 'ส่วนกลาง' },
    },
    FacilityDetail: {
      screen: FacilityDetailScreen,
      options: ({ route }) => ({ title: route.params?.facility?.name || 'รายละเอียด' }),
    },
    BookingHistory: {
      screen: BookingHistoryScreen,
      options: { title: 'ประวัติการจอง' },
    },
  },
});

const ParcelStack = createNativeStackNavigator({
  screenOptions: stackScreenOptions,
  screens: {
    ParcelMain: {
      screen: ParcelScreen,
      options: { title: 'พัสดุ' },
    },
  },
});

const SocialStack = createNativeStackNavigator({
  screenOptions: stackScreenOptions,
  screens: {
    SocialMain: {
      screen: SocialFeedScreen,
      options: { title: 'ฟีดชุมชน' },
    },
  },
});

const ChatbotStack = createNativeStackNavigator({
  screenOptions: stackScreenOptions,
  screens: {
    ChatbotMain: {
      screen: ChatbotScreen,
      options: { title: 'Liven Assistant' },
    },
  },
});

// --- Bottom Tabs ---
const Tabs = createBottomTabNavigator({
  screenOptions: {
    headerShown: false, // Each stack provides its own header
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle: {
      paddingBottom: Platform.OS === 'ios' ? 20 : 12,
      paddingTop: 8,
      height: Platform.OS === 'ios' ? 88 : 72,
      borderTopColor: colors.border,
    },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
  },
  screens: {
    Home: {
      screen: HomeStack,
      options: {
        title: 'หน้าหลัก',
        tabBarIcon: ({ color, size, focused }) => <HomeIcon color={color} size={size} filled={focused} />,
      },
    },
    Facility: {
      screen: FacilityStack,
      options: {
        title: 'ส่วนกลาง',
        tabBarIcon: ({ color, size, focused }) => <FacilityIcon color={color} size={size} filled={focused} />,
      },
    },
    Parcel: {
      screen: ParcelStack,
      options: {
        title: 'พัสดุ',
        tabBarIcon: ({ color, size, focused }) => <ParcelIcon color={color} size={size} filled={focused} />,
      },
    },
    Social: {
      screen: SocialStack,
      options: {
        title: 'ฟีด',
        tabBarIcon: ({ color, size, focused }) => <SocialIcon color={color} size={size} filled={focused} />,
      },
    },
    Chatbot: {
      screen: ChatbotStack,
      options: {
        title: 'แชทบอท',
        tabBarIcon: ({ color, size, focused }) => <ChatbotIcon color={color} size={size} filled={focused} />,
      },
    },
  },
});

const Navigation = createStaticNavigation(Tabs);

// --- Logout handler (accessible from HomeScreen) ---
let logoutHandler = null;
export function getLogoutHandler() { return logoutHandler; }

const AppNavigator = () => {
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleLogout = useCallback(() => {
    Alert.alert('ออกจากระบบ', 'คุณต้องการออกจากระบบหรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ออกจากระบบ',
        style: 'destructive',
        onPress: () => { supabase.auth.signOut(); setApproved(false); },
      },
    ]);
  }, []);

  useEffect(() => {
    logoutHandler = handleLogout;
    return () => { logoutHandler = null; };
  }, [handleLogout]);

  useEffect(() => {
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!s) setApproved(false);
    });
    return () => subscription?.unsubscribe();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    try {
      const res = await api.get('/auth/me/');
      if (res.data.status === 'approved') setApproved(true);
    } catch { /* not approved */ }
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!approved) {
    return <LoginScreen onLogin={() => setApproved(true)} />;
  }

  return <Navigation />;
};

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
});

export default AppNavigator;
