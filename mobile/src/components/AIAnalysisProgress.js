import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const AIAnalysisProgress = ({ visible, analysisId, doctorId, onComplete, onError }) => {
  const [progress, setProgress] = useState(0);
  const [currentCategory, setCurrentCategory] = useState('');
  const [status, setStatus] = useState('Iniciando análise...');
  const [results, setResults] = useState([]);
  const [pollInterval, setPollInterval] = useState(null);

  const categories = [
    'Diagnóstico principal',
    'Etiologia', 
    'Fisiopatologia',
    'Apresentação Clínica',
    'Abordagem diagnóstica',
    'Abordagem Terapêutica',
    'Guia de Prescrição'
  ];

  // Simulate progress updates (replace with actual API polling)
  const simulateProgress = () => {
    let currentProgress = 0;
    let categoryIndex = 0;

    const interval = setInterval(() => {
      currentProgress += Math.random() * 15 + 5; // Random progress between 5-20%
      
      if (currentProgress >= 100) {
        currentProgress = 100;
        setProgress(100);
        setStatus('Análise concluída!');
        setCurrentCategory('');
        
        clearInterval(interval);
        
        // Simulate completion after a short delay
        setTimeout(() => {
          onComplete({
            analysisId,
            confidence: 0.85 + Math.random() * 0.1, // Random confidence 85-95%
            results: results
          });
        }, 1500);
        return;
      }

      setProgress(Math.min(currentProgress, 100));
      
      // Update current category based on progress
      const newCategoryIndex = Math.min(
        Math.floor((currentProgress / 100) * categories.length),
        categories.length - 1
      );
      
      if (newCategoryIndex !== categoryIndex && newCategoryIndex < categories.length) {
        categoryIndex = newCategoryIndex;
        const category = categories[categoryIndex];
        setCurrentCategory(category);
        setStatus(`Analisando: ${category}`);
        
        // Mark previous categories as completed
        setResults(prev => {
          const updated = [...prev];
          for (let i = 0; i < categoryIndex; i++) {
            if (!updated[i]) {
              updated[i] = {
                category: categories[i],
                status: 'completed',
                timestamp: new Date()
              };
            }
          }
          // Add current category as processing
          updated[categoryIndex] = {
            category: category,
            status: 'processing',
            timestamp: new Date()
          };
          return updated;
        });
      }
    }, 800 + Math.random() * 1200); // Random interval between 0.8-2 seconds

    return interval;
  };

  // Alternative: Real API polling function
  const pollAnalysisStatus = async () => {
    try {
      const response = await fetch(`/api/analysis/${analysisId}/status`);
      const data = await response.json();
      
      setProgress(data.progress || 0);
      setCurrentCategory(data.currentCategory || '');
      setStatus(data.status || 'Processando...');
      
      if (data.completed) {
        clearInterval(pollInterval);
        onComplete(data);
      } else if (data.error) {
        clearInterval(pollInterval);
        onError(data);
      }
    } catch (error) {
      console.error('Error polling analysis status:', error);
      // Continue polling on error, but could implement retry logic
    }
  };

  useEffect(() => {
    if (visible && analysisId) {
      // Option 1: Use simulation for demo
      const interval = simulateProgress();
      setPollInterval(interval);
      
      // Option 2: Use real API polling (uncomment to use)
      // const interval = setInterval(pollAnalysisStatus, 2000);
      // setPollInterval(interval);

      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }
  }, [visible, analysisId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  const getStatusIcon = (categoryStatus) => {
    switch (categoryStatus) {
      case 'completed':
        return <Icon name="check-circle" size={20} color="#10B981" />;
      case 'processing':
        return <ActivityIndicator size="small" color="#3B82F6" />;
      case 'error':
        return <Icon name="error" size={20} color="#EF4444" />;
      default:
        return <Icon name="radio-button-unchecked" size={20} color="#D1D5DB" />;
    }
  };

  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Icon name="psychology" size={32} color="#3B82F6" />
            <Text style={styles.title}>Análise de IA em Progresso</Text>
            <Text style={styles.subtitle}>Aguarde enquanto nossa IA analisa os dados médicos</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View 
                style={[styles.progressFill, { width: `${progress}%` }]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}% concluído</Text>
          </View>

          {/* Current Status */}
          <View style={styles.statusSection}>
            <Text style={styles.statusText}>{status}</Text>
            {currentCategory && (
              <Text style={styles.currentCategory}>📋 {currentCategory}</Text>
            )}
          </View>

          {/* Categories List */}
          <View style={styles.categoriesSection}>
            <Text style={styles.categoriesTitle}>Categorias de Análise:</Text>
            {categories.map((category, index) => {
              const result = results.find(r => r.category === category);
              const isCurrentCategory = currentCategory === category;
              const isCompleted = progress > ((index + 1) / categories.length) * 100;
              
              let categoryStatus = 'pending';
              if (result) {
                categoryStatus = result.status;
              } else if (isCompleted) {
                categoryStatus = 'completed';
              } else if (isCurrentCategory) {
                categoryStatus = 'processing';
              }

              return (
                <View 
                  key={category} 
                  style={[
                    styles.categoryItem,
                    isCurrentCategory && styles.categoryItemActive
                  ]}
                >
                  {getStatusIcon(categoryStatus)}
                  <Text style={[
                    styles.categoryText,
                    categoryStatus === 'completed' && styles.categoryTextCompleted,
                    isCurrentCategory && styles.categoryTextActive
                  ]}>
                    {category}
                  </Text>
                  {result && (
                    <Text style={styles.categoryTime}>
                      {result.timestamp.toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* AI Info */}
          <View style={styles.aiInfo}>
            <Icon name="auto-awesome" size={16} color="#6B7280" />
            <Text style={styles.aiInfoText}>
              Powered by Medical AI • Análise baseada em evidências científicas
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  progressSection: {
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  statusText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  currentCategory: {
    fontSize: 14,
    color: '#3B82F6',
    marginTop: 4,
  },
  categoriesSection: {
    marginBottom: 20,
  },
  categoriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  categoryItemActive: {
    backgroundColor: '#EBF4FF',
  },
  categoryText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 12,
    flex: 1,
  },
  categoryTextCompleted: {
    color: '#10B981',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  categoryTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  aiInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  aiInfoText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
  },
});

export default AIAnalysisProgress;