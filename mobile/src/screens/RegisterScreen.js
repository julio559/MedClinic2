import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '', crm: '', specialty: ''
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!formData.name || !formData.email || !formData.password || !formData.crm) {
      Alert.alert('Erro', 'Preencha os campos obrigatórios');
      return;
    }

    setLoading(true);
    const result = await register(formData);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Erro', result.error);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <LinearGradient colors={['#1E3A8A', '#3B82F6']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.title}>Cadastre-se</Text>
            <Text style={styles.subtitle}>Crie sua conta médica</Text>
            
            <View style={styles.form}>
              <TextInput style={styles.input} placeholder="Nome completo *" value={formData.name} onChangeText={(value) => updateField('name', value)} />
              <TextInput style={styles.input} placeholder="Email *" value={formData.email} onChangeText={(value) => updateField('email', value)} keyboardType="email-address" autoCapitalize="none" />
              <TextInput style={styles.input} placeholder="Senha *" value={formData.password} onChangeText={(value) => updateField('password', value)} secureTextEntry />
              <TextInput style={styles.input} placeholder="Telefone" value={formData.phone} onChangeText={(value) => updateField('phone', value)} keyboardType="phone-pad" />
              <TextInput style={styles.input} placeholder="CRM *" value={formData.crm} onChangeText={(value) => updateField('crm', value)} />
              <TextInput style={styles.input} placeholder="Especialidade" value={formData.specialty} onChangeText={(value) => updateField('specialty', value)} />
              
              <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={loading}>
                <Text style={styles.registerButtonText}>{loading ? 'Criando conta...' : 'Criar conta'}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLinkText}>Já tem conta? Faça login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#E5E7EB', textAlign: 'center', marginBottom: 48 },
  form: { backgroundColor: 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 8 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 16, fontSize: 16, marginBottom: 16, backgroundColor: '#F9FAFB' },
  registerButton: { backgroundColor: '#1E3A8A', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 16 },
  registerButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  loginLink: { alignItems: 'center' },
  loginLinkText: { color: '#6B7280', fontSize: 14 }
});

export default RegisterScreen;
