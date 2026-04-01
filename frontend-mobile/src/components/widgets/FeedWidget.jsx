import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import api from '../../services/api';
import { colors, radius } from '../../theme';

const FeedWidget = ({ onPress }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const res = await api.get('/posts/'); setPosts((res.data.results || res.data || []).slice(0, 3)); } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.title}>Social Feed</Text>
      {loading ? <Text style={styles.muted}>กำลังโหลด...</Text> : posts.length === 0 ? <Text style={styles.muted}>ยังไม่มีโพสต์</Text> : (
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
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },
  item: { marginBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingBottom: 6 },
  author: { fontSize: 12, fontWeight: '600', color: colors.accent },
  content: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  muted: { color: colors.textMuted, fontSize: 13 },
});

export default FeedWidget;
