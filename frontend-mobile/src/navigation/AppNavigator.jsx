import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from '../services/supabase';
import api from '../services/api';
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

const HomeStack = createNativeStackNavigator({
  screens: {
    HomeMain: {
      screen: HomeScreen,
      options: { headerShown: false },
    },
    News: {
      screen: NewsScreen,
      options: { title: 'ข่าวสาร' },
    },
  },
});

const FacilityStack = createNativeStackNavigator({
  screens: {
    FacilityList: {
      screen: FacilityScreen,
      options: { headerShown: false },
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

const Tabs = createBottomTabNavigator({
  screenOptions: {
    headerShown: true,
    tabBarActiveTintColor: '#4F46E5',
    tabBarInactiveTintColor: '#9CA3AF',
    tabBarStyle: {
      paddingBottom: Platform.OS === 'ios' ? 20 : 12,
      paddingTop: 8,
      height: Platform.OS === 'ios' ? 88 : 72,
    },
  },
  screens: {
    Home: {
      screen: HomeStack,
      options: {
        title: 'หน้าหลัก',
        tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} />,
      },
    },
    Facility: {
      screen: FacilityStack,
      options: {
        title: 'ส่วนกลาง',
        tabBarIcon: ({ color, size }) => <FacilityIcon color={color} size={size} />,
      },
    },
    Parcel: {
      screen: ParcelScreen,
      options: {
        title: 'พัสดุ',
        tabBarIcon: ({ color, size }) => <ParcelIcon color={color} size={size} />,
      },
    },
    Social: {
      screen: SocialFeedScreen,
      options: {
        title: 'ฟีด',
        tabBarIcon: ({ color, size }) => <SocialIcon color={color} size={size} />,
      },
    },
    Chatbot: {
      screen: ChatbotScreen,
      options: {
        title: 'แชทบอท',
        tabBarIcon: ({ color, size }) => <ChatbotIcon color={color} size={size} />,
      },
    },
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
