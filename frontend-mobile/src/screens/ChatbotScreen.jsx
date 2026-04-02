import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import api from '../services/api';
import { colors } from '../theme';

const SUGGESTIONS = [
  'ฟิตเนสเปิดกี่โมง?',
  'รับพัสดุที่ไหน?',
  'จองห้องประชุมยังไง?',
  'ค่าส่วนกลางจ่ายยังไง?',
  'แจ้งซ่อมยังไง?',
];

function TypingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim) => ({
    width: 7, height: 7, borderRadius: 4, backgroundColor: colors.textMuted, marginHorizontal: 2,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  });

  return (
    <View style={s.typingRow}>
      <View style={s.avatar}><Text style={s.avatarText}>L</Text></View>
      <View style={s.typingBubble}>
        <Animated.View style={dotStyle(dot1)} />
        <Animated.View style={dotStyle(dot2)} />
        <Animated.View style={dotStyle(dot3)} />
      </View>
    </View>
  );
}

export default function ChatbotScreen() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const flatListRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/chatbot/history/');
        const history = res.data.results || res.data || [];
        // API returns newest-first, reverse to show oldest-first (chat order)
        const sorted = [...history].reverse();
        const msgs = [];
        sorted.forEach((h) => {
          msgs.push({ id: `${h.id}-user`, text: h.user_message, isBot: false });
          msgs.push({ id: `${h.id}-bot`, text: h.bot_response, isBot: true, isEscalated: h.is_escalated });
        });
        setMessages(msgs);
      } catch {}
      setLoadingHistory(false);
    })();
  }, []);

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;
    const userMsg = { id: `user-${Date.now()}`, text: msg, isBot: false };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const res = await api.post('/chatbot/message/', { message: msg });
      setMessages((prev) => [...prev, {
        id: `bot-${Date.now()}`,
        text: res.data.bot_response || res.data.response || 'ไม่มีคำตอบ',
        isBot: true,
        isEscalated: res.data.is_escalated || false,
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `err-${Date.now()}`,
        text: 'ขออภัยครับ ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง',
        isBot: true, isError: true,
      }]);
    }
    setSending(false);
  };

  const renderMessage = ({ item }) => (
    <View style={[s.msgRow, item.isBot ? s.botRow : s.userRow]}>
      {item.isBot && (
        <View style={s.avatar}><Text style={s.avatarText}>L</Text></View>
      )}
      <View style={[s.bubble, item.isBot ? s.botBubble : s.userBubble, item.isError && s.errorBubble]}>
        <Text style={[s.msgText, item.isBot ? s.botText : s.userText]}>{item.text}</Text>
        {item.isEscalated && (
          <Text style={s.escalatedText}>คำถามนี้ถูกส่งต่อไปยังนิติบุคคลแล้ว</Text>
        )}
      </View>
    </View>
  );

  if (loadingHistory) {
    return <View style={s.center}><ActivityIndicator size="large" color={colors.accent}/></View>;
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={s.list}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <View style={s.emptyAvatar}><Text style={s.emptyAvatarText}>L</Text></View>
            <Text style={s.emptyTitle}>Liven Assistant</Text>
            <Text style={s.emptyText}>สวัสดีครับ! ผมช่วยตอบคำถามเกี่ยวกับชุมชนได้ครับ</Text>
            <Text style={s.emptyHint}>ลองถามเรื่องสิ่งอำนวยความสะดวก พัสดุ กิจกรรม หรือกฎระเบียบ</Text>
            <View style={s.suggestionsWrap}>
              {SUGGESTIONS.map((q, i) => (
                <TouchableOpacity key={i} style={s.suggestionChip} onPress={() => handleSend(q)}>
                  <Text style={s.suggestionText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
      />
      {sending && <TypingDots />}
      <View style={s.inputRow}>
        <TextInput style={s.input} placeholder="พิมพ์ข้อความ..." placeholderTextColor={colors.textMuted}
          value={input} onChangeText={setInput} onSubmitEditing={() => handleSend()} editable={!sending}/>
        <TouchableOpacity style={[s.sendBtn, sending && {opacity:0.5}]} onPress={() => handleSend()} disabled={sending}>
          <Text style={s.sendBtnText}>ส่ง</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor:colors.bg },
  center: { flex:1, justifyContent:'center', alignItems:'center' },
  list: { padding:16, paddingBottom:8 },
  msgRow: { flexDirection:'row', marginBottom:10, alignItems:'flex-end' },
  botRow: { justifyContent:'flex-start' },
  userRow: { justifyContent:'flex-end' },
  avatar: { width:28, height:28, borderRadius:14, backgroundColor:colors.primary, justifyContent:'center', alignItems:'center', marginRight:8, marginBottom:2 },
  avatarText: { color:'#FFF', fontSize:12, fontWeight:'700' },
  bubble: { maxWidth:'75%', borderRadius:16, padding:12 },
  botBubble: { backgroundColor:colors.card, borderBottomLeftRadius:4 },
  userBubble: { backgroundColor:colors.primary, borderBottomRightRadius:4 },
  errorBubble: { backgroundColor:colors.dangerLight },
  msgText: { fontSize:15, lineHeight:22 },
  botText: { color:colors.text },
  userText: { color:'#FFF' },
  escalatedText: { fontSize:12, color:colors.warning, marginTop:6, fontStyle:'italic' },
  typingRow: { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingBottom:8 },
  typingBubble: { flexDirection:'row', alignItems:'center', backgroundColor:colors.card, borderRadius:16, paddingHorizontal:14, paddingVertical:10 },
  inputRow: { flexDirection:'row', padding:12, backgroundColor:colors.card, borderTopWidth:1, borderTopColor:colors.border },
  input: { flex:1, borderWidth:1, borderColor:colors.border, borderRadius:20, paddingHorizontal:16, paddingVertical:10, fontSize:15, marginRight:8, color:colors.text },
  sendBtn: { backgroundColor:colors.primary, borderRadius:20, paddingHorizontal:20, justifyContent:'center' },
  sendBtnText: { color:'#FFF', fontWeight:'600' },
  emptyContainer: { alignItems:'center', marginTop:60, paddingHorizontal:24 },
  emptyAvatar: { width:56, height:56, borderRadius:16, backgroundColor:colors.primary, justifyContent:'center', alignItems:'center', marginBottom:14 },
  emptyAvatarText: { color:'#FFF', fontSize:24, fontWeight:'700' },
  emptyTitle: { fontSize:18, fontWeight:'700', color:colors.text, marginBottom:6 },
  emptyText: { fontSize:14, color:colors.textSecondary, textAlign:'center', lineHeight:20 },
  emptyHint: { fontSize:12, color:colors.textMuted, textAlign:'center', marginTop:4, marginBottom:16 },
  suggestionsWrap: { flexDirection:'row', flexWrap:'wrap', justifyContent:'center', gap:8 },
  suggestionChip: { backgroundColor:colors.card, borderWidth:1, borderColor:colors.border, borderRadius:20, paddingHorizontal:14, paddingVertical:8 },
  suggestionText: { fontSize:13, color:colors.accent, fontWeight:'500' },
});
