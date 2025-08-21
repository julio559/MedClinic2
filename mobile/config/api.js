// mobile/src/config/api.js
import { Platform } from 'react-native';

// Configuração da API baseada na plataforma
export const getApiConfig = () => {
  if (Platform.OS === 'web') {
    return {
      baseURL: 'http://localhost:3000',
      apiURL: 'http://localhost:3000/api',
      wsURL: 'http://localhost:3000'
    };
  } 
  
  // Para dispositivos móveis
  return {
    // Para emulador Android: use 10.0.2.2
    // Para dispositivo físico: use o IP da sua máquina (ex: 192.168.1.100)
    // Para emulador iOS: use localhost
    baseURL: 'http://10.0.2.2:3000',
    apiURL: 'http://10.0.2.2:3000/api', 
    wsURL: 'http://10.0.2.2:3000'
  };
};

export const API_CONFIG = getApiConfig();

export default API_CONFIG;