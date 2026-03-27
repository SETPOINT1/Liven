import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import api from '../../services/api';

const FeedWidget = ({ onPress }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await api.get('/posts/');
        setPosts((res.data.results || res.data || []).slice(0, 3));
      } catch {
        // silent
      }
      setLoading(false);
    };
    fetchPosts();
  }, []);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.title}>💬 Social Feed</Text>
      {loading ? (
        <Text style={styles.loadingText}>กำลังโหลด...</Text>
      ) : posts.length === 0 ? (
        <Text style={styles.emptyText}>ยังไม่มีโพสต์</Text>
      ) : (
        posts.map((p) => (
          <View key={p.id} style={styles.item}>
            <Text style={styles.author}>{p.author_name || 'ผู้ใช้'}</Text>
            <Text style={styles.content} numberOfLines={1}>{p.content}</Text>
          </View>
        ))
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  title: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 10 },
  item: { marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 6 },
  author: { fontSize: 12, fontWeight: '600', color: '#4F46E5' },
  content: { fontSize: 13, color: '#374151', marginTop: 2 },
  loadingText: { color: '#9CA3AF', fontSize: 13 },
  emptyText: { color: '#9CA3AF', fontSize: 13 },
});

export default FeedWidget;
