// mobile/src/hook/useAnalysisGate.js
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

export default function useAnalysisGate({
  apiBase,          // ex: http://localhost:3001
  token,            // Bearer token
  doctorId,         // id do médico (ou 'general')
  analysisId,       // id da análise
  onDone,           // callback quando concluir
  onError,          // callback de erro
  pollInterval = 3000
}) {
  const timerRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!apiBase || !analysisId) return;

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // --- 1) Polling de segurança
    const startPolling = () => {
      stopPolling();
      timerRef.current = setInterval(async () => {
        try {
          const res = await fetch(`${apiBase}/api/analysis/${analysisId}/results`, { headers });
          if (!res.ok) return;
          const data = await res.json();
          // Considera "pronto" quando status for completed e houver resultados
          if (data?.status === 'completed' && Array.isArray(data?.AnalysisResults) && data.AnalysisResults.length > 0) {
            stopPolling();
            onDone?.({
              analysisId: data.id,
              title: data.title,
              confidence: data.aiConfidenceScore,
              resultsCount: data.AnalysisResults.length,
            });
          }
          if (data?.status === 'failed') {
            stopPolling();
            onError?.(new Error('A análise falhou.'));
          }
        } catch (err) {
          // ignora erro momentâneo e mantém polling
        }
      }, pollInterval);
    };

    const stopPolling = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    // --- 2) Tenta Socket.IO
    const trySocket = async () => {
      try {
        const { io } = await import('socket.io-client'); // import dinâmico
        // usa websocket no mobile; no web, websocket também funciona
        socketRef.current = io(apiBase, {
          path: '/socket.io',
          transports: ['websocket'],
          extraHeaders: headers,
        });

        socketRef.current.on('connect', () => {
          // entra na sala do médico
          socketRef.current.emit('join_doctor_room', doctorId || 'general');
        });

        socketRef.current.on('analysis_completed', (payload) => {
          if (payload?.analysisId === analysisId) {
            stopPolling();
            onDone?.({
              analysisId: payload.analysisId,
              title: payload.title,
              confidence: payload.confidence,
              resultsCount: payload.resultsCount,
            });
          }
        });

        socketRef.current.on('connect_error', () => {
          // se socket falhar, garante polling
          startPolling();
        });

        // garante polling mesmo com socket, para robustez
        startPolling();
      } catch (e) {
        // sem socket.io-client? segue só com polling
        startPolling();
      }
    };

    trySocket();

    return () => {
      stopPolling();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [apiBase, token, doctorId, analysisId, onDone, onError, pollInterval]);
}
