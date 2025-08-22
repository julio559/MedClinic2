import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

// Socket.IO opcional
let io;
try {
  io = require('socket.io-client').io;
} catch (_) {
  io = null;
}

const POLL_MS = 4000;

const AnalysisResultScreen = ({ route, navigation }) => {
  const { analysisId, doctorId } = route.params;
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({});
  const [joiningSocket, setJoiningSocket] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [progressAnim] = useState(new Animated.Value(0));
  const pollRef = useRef(null);
  const socketRef = useRef(null);

  const BASE = useMemo(
    () => (axios.defaults.baseURL ? axios.defaults.baseURL.replace(/\/$/, '') : ''),
    []
  );

  const imageUrl = (filename) =>
    `${BASE}/uploads/medical-images/${filename}`;

  useEffect(() => {
    loadAnalysisData();
    startPolling();
    
    // Animação de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Socket opcional
    if (io && doctorId) {
      setJoiningSocket(true);
      const s = io(BASE || 'http://localhost:3001', { transports: ['websocket'] });
      socketRef.current = s;
      s.on('connect', () => {
        s.emit('join_doctor_room', doctorId);
        setJoiningSocket(false);
      });
      s.on('analysis_completed', (payload) => {
        if (payload?.analysisId === analysisId) {
          stopPolling();
          loadAnalysisData();
        }
      });
    }

    return () => {
      stopPolling();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [analysisId, doctorId]);

  // Animação de progresso para análises em processamento
  useEffect(() => {
    if (analysis?.status === 'processing') {
      Animated.loop(
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      progressAnim.stopAnimation();
      progressAnim.setValue(0);
    }
  }, [analysis?.status]);

  const startPolling = () => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`/analysis/${analysisId}/results`);
        const a = res.data;
        setAnalysis(a);
        if (a.status === 'completed' || a.status === 'failed') {
          stopPolling();
        }
      } catch (err) {
        // Continue tentando em caso de erro transitório
      }
    }, POLL_MS);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const loadAnalysisData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/analysis/${analysisId}/results`);
      
      // Mock data com resultados mais ricos para demonstração
      const mockAnalysis = {
        id: analysisId,
        title: 'Análise Dermatológica Completa',
        description: 'Paciente apresenta lesão pigmentada suspeita na região dorsal direita, com história de mudança recente na coloração e textura.',
        symptoms: 'Lesão com bordas irregulares, mudança de coloração nos últimos 3 meses, coceira ocasional',
        status: 'completed',
        createdAt: new Date().toISOString(),
        confidence: 0.94,
        priority: 'high',
        MedicalImages: [
          { id: '1', filename: 'lesion_1.jpg' },
          { id: '2', filename: 'lesion_2.jpg' },
          { id: '3', filename: 'dermoscopy.jpg' }
        ],
        AnalysisResults: [
          {
            id: '1',
            category: 'Diagnóstico Principal',
            result: 'Melanoma in situ (Estágio 0)\n\nLesão melanocítica atípica com características compatíveis com melanoma em fase inicial. Apresenta assimetria, bordas irregulares, variação de cor e diâmetro > 6mm (critérios ABCD positivos). A análise histopatológica digital sugere proliferação melanocitária restrita à epiderme, sem evidências de invasão dermal.',
            confidenceScore: 0.94,
            isCompleted: true,
            createdAt: new Date().toISOString(),
            aiModel: 'DermAI v2.1'
          },
          {
            id: '2',
            category: 'Diagnóstico Diferencial',
            result: 'Nevus displásico severo (15% probabilidade)\nCarcinoma basocelular pigmentado (8% probabilidade)\nQueratose seborreica atípica (3% probabilidade)',
            confidenceScore: 0.87,
            isCompleted: true,
            createdAt: new Date().toISOString(),
            aiModel: 'DermAI v2.1'
          },
          {
            id: '3',
            category: 'Recomendações Clínicas',
            result: '1. Excisão cirúrgica imediata com margens de segurança de 0,5-1cm\n2. Exame histopatológico confirmatório\n3. Mapeamento corporal completo para detecção de outras lesões\n4. Seguimento dermatológico a cada 3-6 meses\n5. Fotoproteção rigorosa e autoexame mensal',
            confidenceScore: 0.91,
            isCompleted: true,
            createdAt: new Date().toISOString(),
            aiModel: 'ClinicalAI v1.8'
          },
          {
            id: '4',
            category: 'Análise de Risco',
            result: 'Risco de progressão para melanoma invasivo: ALTO\nFatores de risco identificados: lesão > 6mm, mudança recente, localização em área fotoexposta\nPrognóstico com tratamento adequado: Excelente (sobrevida 5 anos > 99%)',
            confidenceScore: 0.89,
            isCompleted: true,
            createdAt: new Date().toISOString(),
            aiModel: 'RiskAI v1.2'
          },
          {
            id: '5',
            category: 'Análise Dermoscópica',
            result: 'Padrão reticular atípico com áreas de interrupção\nPresença de pontos e glóbulos irregulares\nVéu azul-acinzentado em 30% da lesão\nRede pigmentar com espessamento focal\nEstrutura compatível com melanoma inicial',
            confidenceScore: 0.92,
            isCompleted: true,
            createdAt: new Date().toISOString(),
            aiModel: 'DermoscopicAI v3.0'
          }
        ]
      };

      setAnalysis(response.data || mockAnalysis);
    } catch (error) {
      console.error('Error loading analysis:', error);
      Alert.alert('Erro', 'Não foi possível carregar os resultados da análise');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (category) => {
    setExpandedSections((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    } catch {
      return 'Data inválida';
    }
  };

  const formatDateTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Data inválida';
    }
  };

  const reprocess = async () => {
    try {
      setLoading(true);
      await axios.post(`/analysis/${analysisId}/reprocess`);
      await loadAnalysisData();
      startPolling();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível reprocessar agora.');
    } finally {
      setLoading(false);
    }
  };

  const mainDiag = useMemo(() => {
    if (!analysis?.AnalysisResults?.length) return null;
    return analysis.AnalysisResults.find((r) =>
      /diagn[oó]stico principal/i.test(r.category)
    ) || analysis.AnalysisResults[0];
  }, [analysis]);

  const getStatusConfig = (status) => {
    switch (status) {
      case 'completed':
        return {
          color: '#10B981',
          bg: '#ECFDF5',
          text: 'Análise Concluída',
          icon: 'check-circle'
        };
      case 'processing':
        return {
          color: '#F59E0B',
          bg: '#FFFBEB',
          text: 'Processando com IA',
          icon: 'psychology'
        };
      case 'failed':
        return {
          color: '#EF4444',
          bg: '#FEF2F2',
          text: 'Erro na Análise',
          icon: 'error'
        };
      default:
        return {
          color: '#6B7280',
          bg: '#F9FAFB',
          text: 'Status Desconhecido',
          icon: 'help'
        };
    }
  };

  const getCategoryConfig = (category) => {
    const configs = {
      'Diagnóstico Principal': { color: '#EF4444', bg: '#FEF2F2', icon: 'medical-services' },
      'Diagnóstico Diferencial': { color: '#3B82F6', bg: '#EFF6FF', icon: 'compare' },
      'Recomendações Clínicas': { color: '#10B981', bg: '#ECFDF5', icon: 'assignment' },
      'Análise de Risco': { color: '#F59E0B', bg: '#FFFBEB', icon: 'warning' },
      'Análise Dermoscópica': { color: '#8B5CF6', bg: '#F5F3FF', icon: 'visibility' }
    };
    
    return configs[category] || { color: '#6B7280', bg: '#F9FAFB', icon: 'description' };
  };

  if (loading && !analysis) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner}>
            <ActivityIndicator size="large" color="#667EEA" />
          </View>
          <Text style={styles.loadingText}>Carregando resultados...</Text>
          <Text style={styles.loadingSubtext}>Processando análise da IA</Text>
        </View>
      </View>
    );
  }

  if (!analysis) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Icon name="error" size={80} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>Análise não encontrada</Text>
          <Text style={styles.errorSubtext}>
            Não foi possível carregar os resultados desta análise
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isProcessing = analysis.status === 'processing' || analysis.status === 'pending';
  const isFailed = analysis.status === 'failed';
  const statusConfig = getStatusConfig(analysis.status);
  const confidence = analysis.confidence || (mainDiag?.confidenceScore);
  const confidencePercentage = confidence ? Math.round(confidence * 100) : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header Premium */}
      <View style={styles.headerContainer}>
        <View style={styles.headerGradient} />
        
        <Animated.View style={[
          styles.headerContent,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.headerTitle}>
              <Text style={styles.headerTitleText}>Resultado da Análise</Text>
              <Text style={styles.headerSubtitle}>Análise por Inteligência Artificial</Text>
            </View>
            
            <TouchableOpacity style={styles.shareButton}>
              <Icon name="share" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          {/* Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusLeft}>
              <View style={[styles.statusIcon, { backgroundColor: statusConfig.bg }]}>
                {isProcessing ? (
                  <Animated.View style={{
                    transform: [{
                      rotate: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg']
                      })
                    }]
                  }}>
                    <Icon name={statusConfig.icon} size={20} color={statusConfig.color} />
                  </Animated.View>
                ) : (
                  <Icon name={statusConfig.icon} size={20} color={statusConfig.color} />
                )}
              </View>
              <View style={styles.statusInfo}>
                <Text style={styles.statusText}>{statusConfig.text}</Text>
                <Text style={styles.statusDate}>{formatDateTime(analysis.createdAt)}</Text>
              </View>
            </View>
            
            {confidencePercentage && (
              <View style={styles.confidenceContainer}>
                <Text style={styles.confidenceLabel}>Confiança</Text>
                <Text style={styles.confidenceValue}>{confidencePercentage}%</Text>
                <View style={styles.confidenceBar}>
                  <View style={[
                    styles.confidenceBarFill,
                    { width: `${confidencePercentage}%` }
                  ]} />
                </View>
              </View>
            )}
          </View>
        </Animated.View>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Case Summary */}
        <Animated.View style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.sectionHeader}>
            <Icon name="folder-special" size={24} color="#667EEA" />
            <Text style={styles.sectionTitle}>Caso Clínico</Text>
          </View>
          
          <View style={styles.caseCard}>
            <Text style={styles.caseTitle}>{analysis.title}</Text>
            
            {analysis.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionLabel}>Descrição do Caso:</Text>
                <Text style={styles.descriptionText}>{analysis.description}</Text>
              </View>
            )}

            {analysis.symptoms && (
              <View style={styles.symptomsContainer}>
                <Text style={styles.symptomsLabel}>Sintomas Relatados:</Text>
                <Text style={styles.symptomsText}>{analysis.symptoms}</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Medical Images */}
        {analysis.MedicalImages?.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="photo-library" size={24} color="#10B981" />
              <Text style={styles.sectionTitle}>Imagens Médicas</Text>
              <View style={styles.imageCount}>
                <Text style={styles.imageCountText}>{analysis.MedicalImages.length}</Text>
              </View>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.imagesContainer}
              contentContainerStyle={styles.imagesContent}
            >
              {analysis.MedicalImages.map((img, i) => (
                <View key={img.id} style={styles.imageCard}>
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: imageUrl(img.filename) }}
                      style={styles.medicalImage}
                      resizeMode="cover"
                    />
                    <View style={styles.imageOverlay}>
                      <Icon name="zoom-in" size={24} color="#FFFFFF" />
                    </View>
                  </View>
                  <Text style={styles.imageLabel}>Imagem {i + 1}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* AI Analysis Results */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="psychology" size={24} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Análise da Inteligência Artificial</Text>
          </View>

          {/* Main Diagnosis Card */}
          {mainDiag && (
            <View style={styles.mainDiagnosisCard}>
              <View style={styles.mainDiagnosisHeader}>
                <Icon name="medical-services" size={28} color="#FFFFFF" />
                <Text style={styles.mainDiagnosisTitle}>Diagnóstico Principal</Text>
              </View>
              
              <Text style={styles.mainDiagnosisText}>
                {mainDiag.result.split('\n')[0]}
              </Text>
              
              <View style={styles.mainDiagnosisFooter}>
                <View style={styles.diagnosisConfidence}>
                  <Icon name="verified" size={16} color="#FFFFFF" />
                  <Text style={styles.diagnosisConfidenceText}>
                    {Math.round((mainDiag.confidenceScore || 0) * 100)}% confiança
                  </Text>
                </View>
                <Text style={styles.diagnosisModel}>
                  {mainDiag.aiModel || 'AI Model'}
                </Text>
              </View>
            </View>
          )}

          {/* Processing State */}
          {isProcessing && (
            <View style={styles.processingCard}>
              <View style={styles.processingHeader}>
                <Animated.View style={{
                  transform: [{
                    rotate: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg']
                    })
                  }]
                }}>
                  <Icon name="psychology" size={24} color="#F59E0B" />
                </Animated.View>
                <Text style={styles.processingTitle}>Análise em Processamento</Text>
              </View>
              <Text style={styles.processingText}>
                Nossa IA está analisando as imagens e dados clínicos. 
                {joiningSocket && '\nConectando para notificações em tempo real...'}
              </Text>
              <View style={styles.processingBar}>
                <Animated.View style={[
                  styles.processingBarFill,
                  {
                    transform: [{
                      translateX: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-width, 0]
                      })
                    }]
                  }
                ]} />
              </View>
            </View>
          )}

          {/* Failed State */}
          {isFailed && (
            <View style={styles.failedCard}>
              <View style={styles.failedHeader}>
                <Icon name="error" size={24} color="#EF4444" />
                <Text style={styles.failedTitle}>Erro na Análise</Text>
              </View>
              <Text style={styles.failedText}>
                Ocorreu um erro durante o processamento. Tente reprocessar a análise.
              </Text>
              <TouchableOpacity style={styles.reprocessButton} onPress={reprocess}>
                <Icon name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.reprocessText}>Reprocessar com IA</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Detailed Results */}
          {analysis.AnalysisResults?.length > 0 && (
            <View style={styles.detailedResults}>
              <Text style={styles.detailedResultsTitle}>Resultados Detalhados</Text>
              
              {analysis.AnalysisResults.map((result, index) => {
                const categoryConfig = getCategoryConfig(result.category);
                const isExpanded = expandedSections[result.category];
                
                return (
                  <View key={result.id} style={styles.resultCard}>
                    <TouchableOpacity
                      style={styles.resultHeader}
                      onPress={() => toggleSection(result.category)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.resultHeaderLeft}>
                        <View style={[styles.resultIcon, { backgroundColor: categoryConfig.bg }]}>
                          <Icon name={categoryConfig.icon} size={18} color={categoryConfig.color} />
                        </View>
                        <View style={styles.resultInfo}>
                          <Text style={styles.resultCategory}>{result.category}</Text>
                          <Text style={styles.resultDate}>{formatDate(result.createdAt)}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.resultHeaderRight}>
                        {result.confidenceScore && (
                          <View style={styles.resultConfidence}>
                            <Text style={styles.resultConfidenceText}>
                              {Math.round(result.confidenceScore * 100)}%
                            </Text>
                          </View>
                        )}
                        <Icon
                          name={isExpanded ? 'expand-less' : 'expand-more'}
                          size={24}
                          color="#9CA3AF"
                        />
                      </View>
                    </TouchableOpacity>

                    {isExpanded ? (
                      <View style={styles.resultContent}>
                        <Text style={styles.resultText}>{result.result}</Text>
                        
                        <View style={styles.resultFooter}>
                          <View style={styles.resultMetadata}>
                            {result.aiModel && (
                              <Text style={styles.resultModel}>
                                Modelo: {result.aiModel}
                              </Text>
                            )}
                            {result.isCompleted && (
                              <View style={styles.completedBadge}>
                                <Icon name="check" size={12} color="#10B981" />
                                <Text style={styles.completedText}>Concluído</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.resultPreview}>
                        <Text style={styles.resultPreviewText} numberOfLines={2}>
                          {result.result}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* No Results State */}
          {!analysis.AnalysisResults?.length && !isProcessing && (
            <View style={styles.noResultsCard}>
              <Icon name="inbox" size={48} color="#9CA3AF" />
              <Text style={styles.noResultsTitle}>Sem resultados disponíveis</Text>
              <Text style={styles.noResultsText}>
                A análise ainda não gerou resultados detalhados.
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

export default AnalysisResultScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Header Premium
  headerContainer: {
    height: 200,
    position: 'relative',
    overflow: 'hidden',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0F172A',
    background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
  },
  headerContent: {
    flex: 1,
    paddingTop: StatusBar.currentHeight + 10 || 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInfo: {
    gap: 2,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  confidenceContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  confidenceLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  confidenceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  confidenceBar: {
    width: 60,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },

  loadingSpinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Error State
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#F8FAFC',
  },
  errorIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorSubtext: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    flex: 1,
  },

  // Case Card
  caseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#667EEA',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  caseTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 16,
    lineHeight: 26,
  },
  descriptionContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  symptomsContainer: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  symptomsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  symptomsText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },

  // Images Section
  imageCount: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  imageCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  imagesContainer: {
    paddingVertical: 8,
  },
  imagesContent: {
    paddingRight: 20,
  },
  imageCard: {
    alignItems: 'center',
    marginRight: 16,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  medicalImage: {
    width: 120,
    height: 120,
    backgroundColor: '#F3F4F6',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
  },
  imageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },

  // Main Diagnosis Card
  mainDiagnosisCard: {
    backgroundColor: '#EF4444',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  mainDiagnosisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  mainDiagnosisTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mainDiagnosisText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 16,
    fontWeight: '500',
  },
  mainDiagnosisFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diagnosisConfidence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  diagnosisConfidenceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  diagnosisModel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },

  // Processing Card
  processingCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  processingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  processingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  processingText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    marginBottom: 16,
  },
  processingBar: {
    height: 4,
    backgroundColor: '#FDE68A',
    borderRadius: 2,
    overflow: 'hidden',
  },
  processingBarFill: {
    height: '100%',
    width: '30%',
    backgroundColor: '#F59E0B',
    borderRadius: 2,
  },

  // Failed Card
  failedCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  failedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  failedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991B1B',
  },
  failedText: {
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
    marginBottom: 16,
  },
  reprocessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  reprocessText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Detailed Results
  detailedResults: {
    marginTop: 8,
  },
  detailedResultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 16,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
  },
  resultHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
  },
  resultCategory: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  resultDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  resultHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultConfidence: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resultConfidenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3B82F6',
  },
  resultContent: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  resultText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 16,
  },
  resultFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  resultMetadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultModel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  completedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  resultPreview: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  resultPreviewText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  // No Results
  noResultsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginTop: 20,
  },
  noResultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});