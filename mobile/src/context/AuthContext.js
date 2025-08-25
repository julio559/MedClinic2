import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import API_CONFIG from '../../config/api';

const AuthContext = createContext();
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

// NÃO permitir mock login (evita "Token inválido" depois)
const ALLOW_MOCK_FALLBACK = false;

export const AuthProvider = ({ children }) => {
  const [user, setUser]   = useState(null);
  const [loading, setLoading] = useState(true);

  // Base global
  axios.defaults.baseURL = API_CONFIG.apiURL;
  axios.defaults.timeout = 15000;

  // Interceptor: injeta token em TODAS as requisições
  useEffect(() => {
    let reqId, resId;

    reqId = axios.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem('token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    resId = axios.interceptors.response.use(
      (resp) => resp,
      async (error) => {
        if (error?.response?.status === 401) {
          // token inválido/expirado → limpar e mandar pra login
          await AsyncStorage.removeItem('token');
          delete axios.defaults.headers.common.Authorization;
          setUser(null);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(reqId);
      axios.interceptors.response.eject(resId);
    };
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
        const { data } = await axios.get('/users/profile');
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (err) {
      // Sem token válido → força login
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
      return { success: false, error: 'Login falhou. Verifique credenciais.' };
    }
  };

  const register = async (userData) => {
    try {
      // garanta que está enviando os campos esperados pelo backend
      // name, email, password, crm, specialty (ajuste se necessário)
      const { data } = await axios.post('/auth/register', userData);
      const { token, user: registeredUser } = data;

      await AsyncStorage.setItem('token', token);
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      setUser(registeredUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Registro falhou. Confira os dados.' };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    delete axios.defaults.headers.common.Authorization;
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, API_URL: API_CONFIG.apiURL }}>
      {children}
    </AuthContext.Provider>
  );
};
