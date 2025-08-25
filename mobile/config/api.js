// mobile/src/config/api.js
import { Platform } from 'react-native';

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// TROQUE APENAS ESTA LINHA PELA URL DO SEU CLOUD RUN (sem barra no final)
const PROD_BASE_URL = 'https://medclinic2-551551227298.southamerica-east1.run.app';
// <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

// Se quiser forçar prod mesmo em dev, mude para true
const FORCE_PROD = true;

// Opcional: se for testar em aparelho físico na mesma rede, coloque o IP da sua máquina
// Ex.: '192.168.1.100' — deixe '' para ignorar
const LOCAL_LAN_IP = '';

const stripSlash = (u) => (u ? u.replace(/\/+$/, '') : '');

const getLocalBase = () => {
  if (LOCAL_LAN_IP) return `http://${LOCAL_LAN_IP}:3000`;

  if (Platform.OS === 'android') return 'http://10.0.2.2:3000'; // emulador Android
  if (Platform.OS === 'ios') return 'http://localhost:3000';     // emulador iOS

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin; // web
  }
  return 'http://localhost:3000';
};

const BASE_URL = stripSlash((FORCE_PROD || !__DEV__) ? PROD_BASE_URL : getLocalBase());
const API_URL  = `${BASE_URL}/api`;
const WS_URL   = BASE_URL.replace(/^http(s?):\/\//, 'ws$1://'); // http->ws, https->wss

// Export nos mesmos nomes usados no app
const API_CONFIG = {
  baseURL: BASE_URL,
  apiURL: API_URL,
  wsURL: WS_URL,
};

// (Opcional) helperzinho pra montar endpoints: endpoint('patients') -> .../api/patients
export const endpoint = (p = '') => `${API_URL}/${String(p).replace(/^\/+/, '')}`;

export default API_CONFIG;
export { API_CONFIG, BASE_URL, API_URL, WS_URL };