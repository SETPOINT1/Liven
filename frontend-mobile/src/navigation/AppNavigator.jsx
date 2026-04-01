import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { supabase } from '../services/supabase';
import api from '../services/api';
import { colors } from '../theme';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import NewsScreen from '../screens/NewsScreen';
import ParcelScreen from '../screens/ParcelScreen';
import SocialFeedScreen from '../screens/SocialFeedScreen';
import ChatbotScreen from '../screens/ChatbotScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(true);

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
        <Text style={styles.loaderText}>กำลังโหลด...</Text>
      </View>
    );
  }

  if (!approved) return <LoginScreen onLogin={() => setApproved(true)} />;

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.card, elevation: 0, shadowOpacity: 0 },
          headerTitleStyle: { color: colors.text, fontWeight: '600', fontSize: 17 },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { paddingBottom: 6, paddingTop: 4, height: 60, backgroundColor: colors.card },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'หน้าหลัก' }} />
        <Tab.Screen name="News" component={NewsScreen} options={{ title: 'ข่าวสาร' }} />
        <Tab.Screen name="Parcel" component={ParcelScreen} options={{ title: 'พัสดุ' }} />
        <Tab.Screen name="Social" component={SocialFeedScreen} options={{ title: 'ฟีด' }} />
        <Tab.Screen name="Chatbot" component={ChatbotScreen} options={{ title: 'แชทบอท' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  loaderText: { color: colors.textMuted, marginTop: 12, fontSize: 14 },
});
