import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { supabase } from '../services/supabase';
import api from '../services/api';

const LoginScreen = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }
    setLoading(true);
    setPendingMessage('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Check user status from backend
      try {
        const res = await api.get('/auth/me/');
        if (res.data.status === 'pending') {
          Alert.alert('รอการอนุมัติ', 'บัญชีของคุณอยู่ระหว่างรอการอนุมัติจากนิติบุคคล');
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
        if (res.data.status === 'rejected') {
          Alert.alert('บัญชีถูกปฏิเสธ', 'บัญชีของคุณถูกปฏิเสธ กรุณาติดต่อนิติบุคคล');
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
        if (res.data.status === 'suspended') {
          Alert.alert('บัญชีถูกระงับ', 'บัญชีของคุณถูกระงับ กรุณาติดต่อนิติบุคคล');
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
        onLogin();
      } catch (meErr) {
        const code = meErr.response?.data?.error?.code;
        if (code === 'USER_NOT_FOUND') {
          Alert.alert('ไม่พบผู้ใช้', 'ไม่พบข้อมูลผู้ใช้ในระบบ กรุณาลงทะเบียนก่อน');
        } else {
          Alert.alert('ข้อผิดพลาด', 'ไม่สามารถตรวจสอบสถานะบัญชีได้ กรุณาลองใหม่');
        }
        await supabase.auth.signOut();
      }
    } catch (err) {
      Alert.alert('เข้าสู่ระบบไม่สำเร็จ', err.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!email || !password || !fullName || !phone || !unitNumber) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      await api.post('/auth/register/', {
        email, full_name: fullName, phone, unit_number: unitNumber,
        supabase_uid: data.user?.id,
      });
      setPendingMessage('ลงทะเบียนสำเร็จ! กรุณารอการอนุมัติจากนิติบุคคล');
      setIsRegister(false);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'ลงทะเบียนไม่สำเร็จ';
      Alert.alert('ข้อผิดพลาด', msg);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Liven</Text>
        <Text style={styles.subtitle}>ชุมชนอัจฉริยะ</Text>

        {pendingMessage ? (
          <View style={styles.pendingBox}>
            <Text style={styles.pendingText}>{pendingMessage}</Text>
          </View>
        ) : null}

        {isRegister && (
          <>
            <TextInput style={styles.input} placeholder="ชื่อ-นามสกุล" placeholderTextColor="#9CA3AF" value={fullName} onChangeText={setFullName} />
            <TextInput style={styles.input} placeholder="เบอร์โทรศัพท์" placeholderTextColor="#9CA3AF" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <TextInput style={styles.input} placeholder="หมายเลขห้อง/บ้าน" placeholderTextColor="#9CA3AF" value={unitNumber} onChangeText={setUnitNumber} />
          </>
        )}

        <TextInput style={styles.input} placeholder="อีเมล" placeholderTextColor="#9CA3AF" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="รหัสผ่าน" placeholderTextColor="#9CA3AF" value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={styles.button} onPress={isRegister ? handleRegister : handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{isRegister ? 'ลงทะเบียน' : 'เข้าสู่ระบบ'}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { setIsRegister(!isRegister); setPendingMessage(''); }}>
          <Text style={styles.switchText}>
            {isRegister ? 'มีบัญชีแล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? ลงทะเบียน'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#4F46E5', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 32 },
  input: {
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8,
    padding: 12, marginBottom: 12, fontSize: 16, color: '#111827',
  },
  button: {
    backgroundColor: '#4F46E5', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  switchText: { color: '#4F46E5', textAlign: 'center', marginTop: 16, fontSize: 14 },
  pendingBox: {
    backgroundColor: '#FEF3C7', borderRadius: 8, padding: 12, marginBottom: 16,
  },
  pendingText: { color: '#92400E', fontSize: 14, textAlign: 'center' },
});

export default LoginScreen;
