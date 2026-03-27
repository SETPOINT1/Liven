import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
  Modal, TouchableOpacity, Platform,
} from 'react-native';
import api from '../services/api';
import { supabase } from '../services/supabase';

const EventsScreen = () => {
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [emergencyPopup, setEmergencyPopup] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState('events');

  const fetchData = useCallback(async () => {
    try {
      const [evtRes, annRes, notifRes] = await Promise.all([
        api.get('/events/'),
        api.get('/announcements/'),
        api.get('/notifications/'),
      ]);

      const evts = evtRes.data.results || evtRes.data || [];
      const anns = annRes.data.results || annRes.data || [];
      const notifs = notifRes.data.results || notifRes.data || [];

      // Sort announcements by priority then date
      const priorityOrder = { emergency: 0, important: 1, normal: 2 };
      anns.sort((a, b) => {
        const pa = priorityOrder[a.priority] ?? 2;
        const pb = priorityOrder[b.priority] ?? 2;
        if (pa !== pb) return pa - pb;
        return new Date(b.created_at) - new Date(a.created_at);
      });

      // Sort events by date
      evts.sort((a, b) => new Date(b.event_date || b.created_at) - new Date(a.event_date || a.created_at));

      setEvents(evts);
      setAnnouncements(anns);
      setNotifications(notifs);

      // Check for emergency announcements
      const emergency = anns.find((a) => a.priority === 'emergency');
      if (emergency) setEmergencyPopup(emergency);
    } catch {
      // silent
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Supabase Realtime for notifications
  useEffect(() => {
    const channel = supabase
      .channel('notification-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  // Setup push notifications (basic — actual push requires native config)
  useEffect(() => {
    try {
      const PushNotification = require('react-native-push-notification');
      PushNotification.configure({
        onNotification: function (notification) {
          fetchData();
        },
        requestPermissions: Platform.OS === 'ios',
      });
    } catch {
      // push notification not available in dev
    }
  }, [fetchData]);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read/`);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    } catch {
      // silent
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const priorityColor = (p) => {
    if (p === 'emergency') return '#DC2626';
    if (p === 'important') return '#F59E0B';
    return '#6B7280';
  };

  const priorityLabel = (p) => {
    if (p === 'emergency') return 'ฉุกเฉิน';
    if (p === 'important') return 'สำคัญ';
    return 'ปกติ';
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Header with notification bell */}
      <View style={styles.header}>
        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, activeTab === 'events' && styles.activeTab]} onPress={() => setActiveTab('events')}>
            <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>กิจกรรม</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'announcements' && styles.activeTab]} onPress={() => setActiveTab('announcements')}>
            <Text style={[styles.tabText, activeTab === 'announcements' && styles.activeTabText]}>ประกาศ</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.bellBtn} onPress={() => setShowNotifications(true)}>
          <Text style={styles.bellText}>🔔</Text>
          {unreadCount > 0 ? (
            <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>
          ) : null}
        </TouchableOpacity>
      </View>

      {activeTab === 'events' ? (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
          ListEmptyComponent={<Text style={styles.emptyText}>ไม่มีกิจกรรม</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDate}>📅 {formatDate(item.event_date)}</Text>
              {item.location ? <Text style={styles.cardDetail}>📍 {item.location}</Text> : null}
              {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}
            </View>
          )}
        />
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
          ListEmptyComponent={<Text style={styles.emptyText}>ไม่มีประกาศ</Text>}
          renderItem={({ item }) => (
            <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: priorityColor(item.priority) }]}>
              <View style={styles.annHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={[styles.priorityBadge, { backgroundColor: priorityColor(item.priority) + '20' }]}>
                  <Text style={[styles.priorityText, { color: priorityColor(item.priority) }]}>{priorityLabel(item.priority)}</Text>
                </View>
              </View>
              <Text style={styles.cardDesc}>{item.content}</Text>
              <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
            </View>
          )}
        />
      )}

      {/* Emergency Popup */}
      <Modal visible={emergencyPopup !== null} transparent animationType="fade">
        <View style={styles.emergencyOverlay}>
          <View style={styles.emergencyContent}>
            <Text style={styles.emergencyIcon}>🚨</Text>
            <Text style={styles.emergencyTitle}>ประกาศฉุกเฉิน</Text>
            <Text style={styles.emergencyBody}>{emergencyPopup?.title}</Text>
            <Text style={styles.emergencyDesc}>{emergencyPopup?.content}</Text>
            <TouchableOpacity style={styles.emergencyBtn} onPress={() => setEmergencyPopup(null)}>
              <Text style={styles.emergencyBtnText}>รับทราบ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal visible={showNotifications} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>การแจ้งเตือน</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={<Text style={styles.emptyText}>ไม่มีการแจ้งเตือน</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.notifItem, !item.is_read && styles.notifUnread]}
                  onPress={() => markAsRead(item.id)}
                >
                  <Text style={styles.notifTitle}>{item.title}</Text>
                  <Text style={styles.notifBody}>{item.body}</Text>
                  <Text style={styles.notifDate}>{formatDate(item.created_at)}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tabs: { flexDirection: 'row' },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  activeTab: { backgroundColor: '#4F46E5' },
  tabText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  activeTabText: { color: '#FFF' },
  bellBtn: { position: 'relative', padding: 4 },
  bellText: { fontSize: 22 },
  badge: { position: 'absolute', top: -2, right: -4, backgroundColor: '#DC2626', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  list: { padding: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  cardDate: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  cardDetail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  cardDesc: { fontSize: 14, color: '#374151', marginTop: 6 },
  annHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priorityBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  priorityText: { fontSize: 12, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
  emergencyOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  emergencyContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, alignItems: 'center', width: '100%' },
  emergencyIcon: { fontSize: 48 },
  emergencyTitle: { fontSize: 20, fontWeight: '700', color: '#DC2626', marginTop: 8 },
  emergencyBody: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginTop: 12, textAlign: 'center' },
  emergencyDesc: { fontSize: 14, color: '#374151', marginTop: 8, textAlign: 'center' },
  emergencyBtn: { backgroundColor: '#DC2626', borderRadius: 8, paddingHorizontal: 32, paddingVertical: 12, marginTop: 20 },
  emergencyBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  closeText: { fontSize: 20, color: '#6B7280', padding: 4 },
  notifItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  notifUnread: { backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 8, marginBottom: 4 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  notifBody: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  notifDate: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
});

export default EventsScreen;
