// mobile/src/hook/useAnalysisGate.js
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

export const useAnalysisGate = ({
  apiBase,          // ex: http://localhost:3001
  token,            // Bearer token
  doctorId,         // id do médico (ou 'general')
  analysisId,       // id da análise
  onDone,           // callback quando concluir (opcional)
  onError,          // callback de erro (opcional)
  pollInterval = 3000
}) => {
  const [status, setStatus] = useState('pending');
  const [resultsReady, setResultsReady] = useState(false);
  const [error, setError] = useState(null);
  
  const timerRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!apiBase || !analysisId) {
      setError('Parâmetros inválidos');
      return;
    }

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // --- 1) Função de polling
    const checkAnalysisStatus = async () => {
      try {
        const response = await fetch(`${apiBase}/api/analysis/${analysisId}/results`, { 
          headers,
          timeout: 10000 
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log('Status da análise:', data.status);
        setStatus(data.status || 'pending');
        
        // Verifica se está pronta
        if (data?.status === 'completed' && Array.isArray(data?.AnalysisResults) && data.AnalysisResults.length > 0) {
          console.log('✅ Análise concluída!');
          setResultsReady(true);
          stopPolling();
          
          // Chama callback se fornecido
          if (onDone) {
            onDone({
              analysisId: data.id,
              title: data.title,
              confidence: data.aiConfidenceScore,
              resultsCount: data.AnalysisResults.length,
            });
          }
        } else if (data?.status === 'failed') {
          console.log('❌ Análise falhou');
          setError('A análise falhou durante o processamento');
          stopPolling();
          
          if (onError) {
            onError(new Error('A análise falhou.'));
          }
        }
      } catch (err) {
        console.log('Erro no polling (continuando):', err.message);
        // Não para o polling em caso de erro de rede temporário
      }
    };

    // --- 2) Função para iniciar polling
    const startPolling = () => {
      console.log('🔄 Iniciando polling...');
      stopPolling(); // Garante que não há polling anterior
      
      // Primeira verificação imediata
      checkAnalysisStatus();
      
      // Depois verifica a cada intervalo
      timerRef.current = setInterval(checkAnalysisStatus, pollInterval);
    };

    const stopPolling = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        console.log('⏹️ Polling parado');
      }
    };

    // --- 3) Tenta Socket.IO (opcional)
    const trySocket = async () => {
      try {
        // Import dinâmico do socket.io-client
        const { io } = await import('socket.io-client');
        
        console.log('🔌 Tentando conectar via Socket.IO...');
        
        socketRef.current = io(apiBase, {
          path: '/socket.io',
          transports: ['websocket', 'polling'], // Fallback para polling
          timeout: 5000,
          extraHeaders: headers,
        });

        socketRef.current.on('connect', () => {
          console.log('✅ Socket conectado');
          // Entra na sala do médico
          socketRef.current.emit('join_doctor_room', doctorId || 'general');
        });

        socketRef.current.on('analysis_completed', (payload) => {
          console.log('📡 Recebido via socket:', payload);
          if (payload?.analysisId === analysisId) {
            setResultsReady(true);
            setStatus('completed');
            stopPolling();
            
            if (onDone) {
              onDone({
                analysisId: payload.analysisId,
                title: payload.title,
                confidence: payload.confidence,
                resultsCount: payload.resultsCount,
              });
            }
          }
        });

        socketRef.current.on('connect_error', (err) => {
          console.log('❌ Erro de conexão Socket.IO:', err.message);
          // Se socket falhar, garante que polling está ativo
          startPolling();
        });

        socketRef.current.on('disconnect', () => {
          console.log('🔌 Socket desconectado');
        });

        // Mesmo com socket, mantém polling como backup
        startPolling();
        
      } catch (socketError) {
        console.log('Socket.IO não disponível, usando apenas polling:', socketError.message);
        // Se não conseguir importar socket.io-client, usa só polling
        startPolling();
      }
    };

    // Iniciar o processo
    trySocket();

    // Cleanup
    return () => {
      console.log('🧹 Limpando useAnalysisGate...');
      stopPolling();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [apiBase, token, doctorId, analysisId, pollInterval]);

  // Função para atualização manual
  const refresh = () => {
    setError(null);
    setResultsReady(false);
    setStatus('pending');
    
    // Reinicia o processo
    if (apiBase && analysisId) {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      fetch(`${apiBase}/api/analysis/${analysisId}/results`, { headers })
        .then(response => response.json())
        .then(data => {
          setStatus(data.status || 'pending');
          if (data?.status === 'completed' && data?.AnalysisResults?.length > 0) {
            setResultsReady(true);
          }
        })
        .catch(err => {
          console.log('Erro no refresh:', err.message);
          setError('Erro ao atualizar status');
        });
    }
  };

  return {
    status,
    resultsReady,
    error,
    refresh
  };
};

// Export default também para compatibilidade
export default useAnalysisGate;