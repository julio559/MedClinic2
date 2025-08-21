import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ActivityIndicator,
  TouchableOpacity,
  Animated
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const AIAnalysisProgress = ({ visible, analysisId, doctorId, onComplete, onError }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [progressAnim] = useState(new Animated.Value(0));

  const steps = [
    { id: 1, name: 'Analisando dados...', icon: 'analytics' },
    { id: 2, name: 'Processando imagens...', icon: 'image' },
    { id: 3, name: 'Gerando diagnóstico...', icon: 'psychology' },
    { id: 4, name: 'Calculando confiança...', icon: 'calculate' },
    { id: 5, name: 'Finalizando relatório...', icon: 'description' },
    { id: 6, name: 'Análise concluída!', icon: 'check-circle' }
  ];

  useEffect(() => {
    if (visible && analysisId) {
      startAnalysisSimulation();
    }
  }, [visible, analysisId]);

  useEffect(() => {
    // Animar barra de progresso
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const startAnalysisSimulation = async () => {
    setCurrentStep(0);
    setProgress(0);
    setIsCompleted(false);
    setHasError(false);

    try {
      // Simular cada etapa do processamento
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(i);
        setProgress((i + 1) / steps.length * 100);
        
        // Tempo variado para cada etapa
        const delay = i === 0 ? 1500 : // Análise inicial mais longa
                     i === 2 ? 2000 : // Diagnóstico mais longo
                     1000; // Outras etapas
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Simular resposta da IA
      setTimeout(() => {
        setIsCompleted(true);
        
        const mockAnalysisData = {
          analysisId: analysisId,
          title: 'Análise Médica Completa',
          confidence: 0.85 + Math.random() * 0.1, // 85-95% de confiança
          resultsCount: 7,
          message: 'Análise de IA concluída com sucesso!'
        };

        onComplete && onComplete(mockAnalysisData);
      }, 1000);

    } catch (error) {
      console.error('Erro na simulação de análise:', error);
      setHasError(true);
      onError && onError({ message: 'Erro durante o processamento da IA' });
    }
  };

  const handleClose = () => {
    if (isCompleted || hasError) {
      // Só permite fechar se concluído ou com erro
      onComplete && onComplete({ analysisId, confidence: 0.9, resultsCount: 7 });
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Icon name="psychology" size={24} color="#1E3A8A" />
            </View>
            <Text style={styles.title}>IA Médica Processando</Text>
            {(isCompleted || hasError) && (
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%']
                    })
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>

          {/* Steps */}
          <View style={styles.stepsContainer}>
            {steps.map((step, index) => (
              <View key={step.id} style={styles.stepItem}>
                <View style={[
                  styles.stepIcon,
                  index < currentStep ? styles.stepCompleted :
                  index === currentStep ? styles.stepActive :
                  styles.stepPending
                ]}>
                  {index < currentStep ? (
                    <Icon name="check" size={16} color="#FFFFFF" />
                  ) : index === currentStep && !isCompleted && !hasError ? (
                    <ActivityIndicator size={16} color="#FFFFFF" />
                  ) : (
                    <Icon name={step.icon} size={16} color={
                      index === currentStep ? "#FFFFFF" : "#9CA3AF"
                    } />
                  )}
                </View>
                <Text style={[
                  styles.stepText,
                  index <= currentStep ? styles.stepTextActive : styles.stepTextPending
                ]}>
                  {step.name}
                </Text>
              </View>
            ))}
          </View>

          {/* Status Messages */}
          {isCompleted && (
            <View style={styles.statusContainer}>
              <Icon name="check-circle" size={24} color="#10B981" />
              <Text style={styles.successText}>
                Análise concluída com sucesso!
              </Text>
            </View>
          )}

          {hasError && (
            <View style={styles.statusContainer}>
              <Icon name="error" size={24} color="#EF4444" />
              <Text style={styles.errorText}>
                Erro durante o processamento
              </Text>
            </View>
          )}

          {/* Info */}
          <View style={styles.infoContainer}>
            <Icon name="info" size={16} color="#6B7280" />
            <Text style={styles.infoText}>
              Nossa IA está analisando todos os dados fornecidos para gerar um relatório médico completo.
            </Text>
          </View>

          {/* Action Button */}
          {isCompleted && (
            <TouchableOpacity style={styles.actionButton} onPress={handleClose}>
              <Text style={styles.actionButtonText}>Ver Resultados</Text>
              <Icon name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1E3A8A',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
    minWidth: 40,
    textAlign: 'right',
  },
  stepsContainer: {
    marginBottom: 24,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepCompleted: {
    backgroundColor: '#10B981',
  },
  stepActive: {
    backgroundColor: '#1E3A8A',
  },
  stepPending: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
  },
  stepTextActive: {
    color: '#1F2937',
    fontWeight: '500',
  },
  stepTextPending: {
    color: '#9CA3AF',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginLeft: 8,
  },
  actionButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default AIAnalysisProgress;