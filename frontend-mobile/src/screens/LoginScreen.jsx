import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../services/supabase';
import api from '../services/api';
import { colors, radius } from '../theme';
export default function LoginScreen({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');
  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Error', 'Please enter email and password'); return; }
    setLoading(true); setPendingMessage('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      try {
        const res = await api.get('/auth/me/');
        if (res.data.status === 'pending') { Alert.alert('Pending', 'Account pending approval'); await supabase.auth.signOut(); setLoading(false); return; }
        if (res.data.status === 'rejected' || res.data.status === 'suspended') { Alert.alert('Error', 'Account not active'); await supabase.auth.signOut(); setLoading(false); return; }
        onLogin();
      } catch (e) { Alert.alert('Error', 'Cannot verify account'); await supabase.auth.signOut(); }
    } catch (err) { Alert.alert('Error', err.message || 'Login failed'); }
    setLoading(false);
  };
  const handleRegister = async () => {
    if (!email || !password || !fullName || !phone || !unitNumber) { Alert.alert('Error', 'Please fill all fields'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      await api.post('/auth/register/', { email, full_name: fullName, phone, unit_number: unitNumber, supabase_uid: data.user?.id });
      setPendingMessage('Registration successful! Awaiting approval.'); setIsRegister(false);
    } catch (err) { Alert.alert('Error', err.message || 'Registration failed'); }
    setLoading(false);
  };
  return (
    <KeyboardAvoidingView style={st.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
        <View style={st.logoBox}>
          <View style={st.logoCircle}><Text style={st.logoL}>L</Text></View>
          <Text style={st.title}>Liven</Text>
          <Text style={st.sub}>Smart Community</Text>
        </View>
        {pendingMessage ? <View style={st.warn}><Text style={st.warnT}>{pendingMessage}</Text></View> : null}
        {isRegister && (<><TextInput style={st.inp} placeholder="Full Name" placeholderTextColor={colors.textMuted} value={fullName} onChangeText={setFullName} /><TextInput style={st.inp} placeholder="Phone" placeholderTextColor={colors.textMuted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" /><TextInput style={st.inp} placeholder="Unit Number" placeholderTextColor={colors.textMuted} value={unitNumber} onChangeText={setUnitNumber} /></>)}
        <TextInput style={st.inp} placeholder="Email" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={st.inp} placeholder="Password" placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={[st.btn, loading && {opacity:0.6}]} onPress={isRegister ? handleRegister : handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={st.btnT}>{isRegister ? 'Register' : 'Login'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setIsRegister(!isRegister); setPendingMessage(''); }}>
          <Text style={st.sw}>{isRegister ? 'Already have account? Login' : 'No account? Register'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const st = StyleSheet.create({
  container:{flex:1,backgroundColor:colors.bg},
  scroll:{flexGrow:1,justifyContent:'center',padding:24},
  logoBox:{alignItems:'center',marginBottom:36},
  logoCircle:{width:64,height:64,borderRadius:18,backgroundColor:colors.primary,justifyContent:'center',alignItems:'center',marginBottom:12},
  logoL:{color:'#FFF',fontSize:28,fontWeight:'700'},
  title:{fontSize:28,fontWeight:'700',color:colors.primary},
  sub:{fontSize:14,color:colors.textMuted,marginTop:2},
  inp:{backgroundColor:colors.card,borderWidth:1,borderColor:colors.border,borderRadius:radius.sm,padding:14,marginBottom:12,fontSize:15,color:colors.text},
  btn:{backgroundColor:colors.primary,borderRadius:radius.sm,padding:16,alignItems:'center',marginTop:8},
  btnT:{color:'#FFF',fontSize:16,fontWeight:'600'},
  sw:{color:colors.accent,textAlign:'center',marginTop:16,fontSize:14},
  warn:{backgroundColor:colors.warningLight,borderRadius:radius.sm,padding:12,marginBottom:16},
  warnT:{color:'#92400E',fontSize:14,textAlign:'center'},
});
