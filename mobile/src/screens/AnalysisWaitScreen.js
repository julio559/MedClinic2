// mobile/src/screens/AnalysisWaitScreen.js
import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  ActivityIndicator, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView 
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { useAnalysisGate } from '../hook/useAnalysisGate';

export default function AnalysisWaitScreen({ apiBase }) {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const analysisId = route.params?.analysisId;
  const doctorId = user?.id || 'general';

  console.log('AnalysisWaitScreen params:', { analysisId, doctorId, apiBase });

  const { status, resultsReady, error, refresh } = useAnalysisGate({
    apiBase: apiBase || 'http://localhost:3000', // fallback
    token: null, // será pego automaticamente pelo axios
    doctorId,
    analysisId,
  });

  useEffect(() => {
    console.log('Status atualizado:', { status, resultsReady, error });
    
    if (resultsReady) {
      console.log('✅ Resultados prontos! Navegando...');
      navigation.replace('AnalysisResult', { analysisId });
    }
  }, [resultsReady, analysisId, navigation]);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'pending': 
        return 'Análise na fila de processamento...';
      case 'processing': 
        return 'IA analisando dados e imagens...';
      case 'completed': 
        return 'Análise concluída! Carregando resultados...';
      case 'failed': 
        return 'Erro no processamento da análise.';
      default: 
        return 'Verificando status da análise...';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed': return 'check-circle';
      case 'failed': return 'error';
      default: return 'psychology';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'failed': return '#EF4444';
      default: return '#1E3A8A';
    }
  };

  if (!analysisId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="error" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Erro</Text>
          <Text style={styles.errorMessage}>ID da análise não encontrado</Text>
          <TouchableOpacity style={styles.button} onPress={handleGoBack}>
            <Text style={styles.buttonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Processando Análise</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Status Icon */}
          <View style={[styles.iconContainer, { backgroundColor: getStatusColor() + '20' }]}>
            {status === 'failed' ? (
              <Icon name={getStatusIcon()} size={64} color={getStatusColor()} />
            ) : (
              <>
                <Icon name={getStatusIcon()} size={64} color={getStatusColor()} />
                {!resultsReady && <ActivityIndicator size="small" color={getStatusColor()} style={styles.overlayLoader} />}
              </>
            )}
          </View>

          {/* Status Message */}
          <Text style={styles.statusTitle}>
            {status === 'failed' ? 'Erro no Processamento' : 'IA Médica Trabalhando'}
          </Text>
          
          <Text style={styles.statusMessage}>{getStatusMessage()}</Text>

          {/* Analysis ID */}
          <View style={styles.analysisIdContainer}>
            <Text style={styles.analysisIdLabel}>ID da Análise:</Text>
            <Text style={styles.analysisIdValue}>{analysisId}</Text>
          </View>

          {/* Progress Indicator */}
          {status !== 'failed' && !resultsReady && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { backgroundColor: getStatusColor() }]} />
              </View>
              <Text style={styles.progressText}>
                Nossa IA está analisando todos os dados médicos fornecidos...
              </Text>
            </View>
          )}

          {/* Error Message */}
          {error && (
            <View style={styles.errorBanner}>
              <Icon name="warning" size={20} color="#F59E0B" />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.refreshButton]} 
              onPress={refresh}
            >
              <Icon name="refresh" size={20} color="#1E3A8A" style={{ marginRight: 8 }} />
              <Text style={[styles.buttonText, styles.refreshButtonText]}>Atualizar Status</Text>
            </TouchableOpacity>

            {status === 'failed' && (
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]} 
                onPress={handleGoBack}
              >
                <Text style={[styles.buttonText, styles.primaryButtonText]}>Tentar Novamente</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Icon name="info" size={16} color="#3B82F6" />
            <Text style={styles.infoText}>
              O processamento geralmente leva entre 30 segundos a 2 minutos, dependendo da complexidade dos dados fornecidos.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  overlayLoader: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  statusMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  analysisIdContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  analysisIdLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  analysisIdValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'monospace',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 24,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    width: '70%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    width: '100%',
  },
  errorBannerText: {
    fontSize: 14,
    color: '#92400E',
    marginLeft: 8,
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  refreshButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  primaryButton: {
    backgroundColor: '#1E3A8A',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButtonText: {
    color: '#1E3A8A',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EBF4FF',
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
    width: '100%',
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
});