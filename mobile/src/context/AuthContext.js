import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Configurar base URL do axios baseado na plataforma
  const getApiUrl = () => {
    if (Platform.OS === 'web') {
      return 'http://localhost:3000/api';
    } else {
      // Para dispositivos físicos, use o IP da sua máquina
      // Para emulador Android: 10.0.2.2
      // Para emulador iOS: localhost
      return 'http://10.0.2.2:3000/api'; // Ajuste conforme necessário
    }
  };

  const API_URL = getApiUrl();
  axios.defaults.baseURL = API_URL;
  axios.defaults.timeout = 10000; // 10 segundos timeout

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Tentar buscar perfil do usuário
        try {
          const response = await axios.get('/users/profile');
          setUser(response.data);
        } catch (apiError) {
          console.log('API not available, using mock user data');
          // Se a API não estiver disponível, usar dados mock
          setUser({
            id: 'mock-user-1',
            name: 'Dr. João Silva',
            email: 'joao@exemplo.com',
            crm: '12345-SP',
            specialty: 'Clínica Geral'
          });
        }
      }
    } catch (error) {
      console.log('Auth check failed:', error);
      await AsyncStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      // Tentar login real primeiro
      const response = await axios.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      await AsyncStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      return { success: true };
    } catch (error) {
      console.log('Real login failed, trying mock login:', error.message);
      
      // Se o login real falhar, fazer login mock para desenvolvimento
      if (email && password) {
        const mockToken = 'mock-token-' + Date.now();
        const mockUser = {
          id: 'mock-user-1',
          name: 'Dr. João Silva',
          email: email,
          crm: '12345-SP',
          specialty: 'Clínica Geral'
        };
        
        await AsyncStorage.setItem('token', mockToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${mockToken}`;
        setUser(mockUser);
        return { success: true };
      }
      
      return { 
        success: false, 
        error: 'Email e senha são obrigatórios' 
      };
    }
  };

  const register = async (userData) => {
    try {
      // Tentar registro real primeiro
      const response = await axios.post('/auth/register', userData);
      const { token, user } = response.data;
      
      await AsyncStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      return { success: true };
    } catch (error) {
      console.log('Real register failed, trying mock register:', error.message);
      
      // Se o registro real falhar, fazer registro mock
      if (userData.name && userData.email && userData.crm) {
        const mockToken = 'mock-token-' + Date.now();
        const mockUser = {
          id: 'mock-user-' + Date.now(),
          name: userData.name,
          email: userData.email,
          crm: userData.crm,
          specialty: userData.specialty || 'Clínica Geral'
        };
        
        await AsyncStorage.setItem('token', mockToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${mockToken}`;
        setUser(mockUser);
        return { success: true };
      }
      
      return { 
        success: false, 
        error: 'Nome, email e CRM são obrigatórios' 
      };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
    } catch (error) {
      console.log('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, API_URL }}>
      {children}
    </AuthContext.Provider>
  );
};