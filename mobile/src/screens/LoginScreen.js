// screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAuth();

  const handleLogin = async () => {
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Preencha todos os campos');
      return;
    }

    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);

    if (!result?.success) {
      // Mostra o erro na tela e não navega
      setErrorMsg(result?.error || 'Credenciais inválidas');
      return;
    }

    // sucesso: se quiser navegar manualmente, descomente:
    // navigation.replace('Home');
  };

  const hasError = !!errorMsg;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerText}>Stitch Design</Text>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
              <Icon name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>

            <Text style={styles.title}>Entrar</Text>

            {/* Error inline */}
            {hasError && (
              <View style={styles.errorBox}>
                <Icon name="error-outline" size={18} color="#EF4444" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* Email Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, hasError && styles.inputError]}
                placeholder="seuemail@exemplo.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={(t) => { setEmail(t); if (hasError) setErrorMsg(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            {/* Password Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Senha</Text>
              <TextInput
                style={[styles.input, hasError && styles.inputError]}
                placeholder="Sua senha"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={(t) => { setPassword(t); if (hasError) setErrorMsg(''); }}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Entrar</Text>
              )}
            </TouchableOpacity>

            {/* Create Account */}
            <TouchableOpacity
              style={styles.createAccountButton}
              onPress={() => navigation.navigate('Register')}
              disabled={loading}
            >
              <Text style={styles.createAccountText}>Criar conta</Text>
            </TouchableOpacity>

            {/* Google Sign In (placeholder) */}
            <TouchableOpacity style={styles.googleButton} disabled={loading}>
              <Icon name="account-circle" size={20} color="#4285F4" />
              <Text style={styles.googleButtonText}>Continuar com Google</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  keyboardView: { flex: 1 },
  content: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20 },
  headerText: { fontSize: 16, color: '#D1D5DB', fontWeight: '500' },
  formContainer: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingTop: 20 },
  closeButton: { alignSelf: 'flex-end', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1F2937', marginBottom: 24, textAlign: 'center' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { color: '#B91C1C', fontSize: 14, fontWeight: '600', flex: 1 },

  inputContainer: { marginBottom: 18 },
  label: { fontSize: 16, color: '#374151', marginBottom: 8, fontWeight: '500' },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 8, padding: 16, fontSize: 16,
    backgroundColor: '#FFFFFF', color: '#1F2937',
  },
  inputError: { borderColor: '#EF4444' },
  forgotPassword: { alignSelf: 'flex-end', marginTop: 8 },
  forgotPasswordText: { fontSize: 14, color: '#6366F1', textDecorationLine: 'underline' },

  loginButton: {
    backgroundColor: '#1E3A8A', borderRadius: 8, padding: 16,
    alignItems: 'center', marginBottom: 16, marginTop: 8,
  },
  loginButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  createAccountButton: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 16,
    alignItems: 'center', marginBottom: 16, backgroundColor: '#FFFFFF',
  },
  createAccountText: { color: '#374151', fontSize: 16, fontWeight: '500' },

  googleButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 16, backgroundColor: '#FFFFFF',
  },
  googleButtonText: { color: '#374151', fontSize: 16, fontWeight: '500', marginLeft: 8 },
});

export default LoginScreen;
