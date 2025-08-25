// mobile/src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import API_CONFIG from '../../config/api'; // ajuste o caminho se necessário

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// Opcional: manter fallback mock quando a API não estiver acessível em dev
const ALLOW_MOCK_FALLBACK = true;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Base da API vinda do API_CONFIG (já inclui /api)
  const API_URL = API_CONFIG.apiURL;

  // Configuração global do axios (mantemos axios global para não quebrar outros usos)
  axios.defaults.baseURL = API_URL;
  axios.defaults.timeout = 10000;

  useEffect(() => {
    checkAuthStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;

        try {
          const { data } = await axios.get('/users/profile');
          setUser(data);
        } catch (apiError) {
          console.log('Falha ao obter /users/profile:', apiError?.message);
          if (ALLOW_MOCK_FALLBACK) {
            console.log('Usando usuário mock (fallback).');
            setUser({
              id: 'mock-user-1',
              name: 'Dr. João Silva',
              email: 'joao@exemplo.com',
              crm: '12345-SP',
              specialty: 'Clínica Geral',
            });
          } else {
            await AsyncStorage.removeItem('token');
            delete axios.defaults.headers.common.Authorization;
            setUser(null);
          }
        }
      }
    } catch (error) {
      console.log('Auth check failed:', error);
      await AsyncStorage.removeItem('token');
      delete axios.defaults.headers.common.Authorization;
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const { data } = await axios.post('/auth/login', { email, password });
      const { token, user: loggedUser } = data;

      await AsyncStorage.setItem('token', token);
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      setUser(loggedUser);
      return { success: true };
    } catch (error) {
      console.log('Login real falhou:', error?.message);

      if (ALLOW_MOCK_FALLBACK && email && password) {
        const mockToken = 'mock-token-' + Date.now();
        const mockUser = {
          id: 'mock-user-1',
          name: 'Dr. João Silva',
          email,
          crm: '12345-SP',
          specialty: 'Clínica Geral',
        };
        await AsyncStorage.setItem('token', mockToken);
        axios.defaults.headers.common.Authorization = `Bearer ${mockToken}`;
        setUser(mockUser);
        return { success: true };
      }

      return { success: false, error: 'Credenciais inválidas ou servidor indisponível.' };
    }
  };

  const register = async (userData) => {
    try {
      const { data } = await axios.post('/auth/register', userData);
      const { token, user: registeredUser } = data;

      await AsyncStorage.setItem('token', token);
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      setUser(registeredUser);
      return { success: true };
    } catch (error) {
      console.log('Registro real falhou:', error?.message);

      if (ALLOW_MOCK_FALLBACK && userData?.name && userData?.email && userData?.crm) {
        const mockToken = 'mock-token-' + Date.now();
        const mockUser = {
          id: 'mock-user-' + Date.now(),
          name: userData.name,
          email: userData.email,
          crm: userData.crm,
          specialty: userData.specialty || 'Clínica Geral',
        };
        await AsyncStorage.setItem('token', mockToken);
        axios.defaults.headers.common.Authorization = `Bearer ${mockToken}`;
        setUser(mockUser);
        return { success: true };
      }

      return { success: false, error: 'Dados obrigatórios ausentes ou servidor indisponível.' };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      delete axios.defaults.headers.common.Authorization;
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