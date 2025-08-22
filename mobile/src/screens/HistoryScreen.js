import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

const HistoryScreen = ({ navigation }) => {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredAnalyses, setFilteredAnalyses] = useState([]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchAnalyses();
    }
    
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
  }, [user]);

  useEffect(() => {
    filterAnalyses();
  }, [searchText, analyses]);

  const fetchAnalyses = async () => {
    try {
      const response = await axios.get('/analysis');
      console.log('Analyses response:', response.data);
      
      const analysesData = response.data || [];
      const validAnalyses = analysesData.filter(analysis => {
        const isValid = analysis && analysis.id;
        if (!isValid) {
          console.warn('Análise inválida encontrada:', analysis);
        }
        return isValid;
      });
      
      setAnalyses(validAnalyses);
    } catch (error) {
      console.error('Erro ao buscar análises:', error);
      Alert.alert(
        'Erro',
        'Não foi possível carregar o histórico de análises. Verifique sua conexão.',
        [
          { text: 'OK' },
          { text: 'Tentar novamente', onPress: fetchAnalyses }
        ]
      );
      
      // Mock data para desenvolvimento
      setAnalyses([
        {
          id: 'mock-1',
          title: 'Análise de Lesão Cutânea',
          diagnosis: 'Possível Psoríase com Superinfecção Bacteriana',
          symptoms: 'Lesão eritematosa com descamação',
          description: 'Paciente apresenta lesões características',
          status: 'completed',
          createdAt: new Date().toISOString(),
          patient: { name: 'João Silva' },
          resultsCount: 3,
          imagesCount: 2,
          confidence: 95,
          priority: 'high'
        },
        {
          id: 'mock-2',
          title: 'Análise Dermatológica',
          diagnosis: 'Dermatite Atópica',
          symptoms: 'Coceira e vermelhidão',
          description: 'Quadro típico de dermatite',
          status: 'completed',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          patient: { name: 'Maria Santos' },
          resultsCount: 2,
          imagesCount: 1,
          confidence: 87,
          priority: 'medium'
        },
        {
          id: 'mock-3',
          title: 'Análise Geral',
          diagnosis: 'Melanoma Suspeito',
          symptoms: 'Lesão suspeita na pele',
          description: 'Análise de imagem enviada',
          status: 'processing',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          patient: null,
          resultsCount: 1,
          imagesCount: 1,
          confidence: 78,
          priority: 'high'
        },
        {
          id: 'mock-4',
          title: 'Avaliação Rotineira',
          diagnosis: 'Ceratose Seborreica',
          symptoms: 'Lesão benigna pigmentada',
          description: 'Check-up preventivo',
          status: 'completed',
          createdAt: new Date(Date.now() - 259200000).toISOString(),
          patient: { name: 'Carlos Oliveira' },
          resultsCount: 1,
          imagesCount: 1,
          confidence: 92,
          priority: 'low'
        }
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalyses();
  };

  const filterAnalyses = () => {
    if (!searchText.trim()) {
      setFilteredAnalyses(analyses);
      return;
    }

    const filtered = analyses.filter(analysis => {
      const searchLower = searchText.toLowerCase();
      return (
        analysis.diagnosis?.toLowerCase().includes(searchLower) ||
        analysis.title?.toLowerCase().includes(searchLower) ||
        analysis.symptoms?.toLowerCase().includes(searchLower) ||
        analysis.description?.toLowerCase().includes(searchLower) ||
        analysis.patient?.name?.toLowerCase().includes(searchLower) ||
        formatDate(analysis.createdAt).includes(searchText)
      );
    });
    setFilteredAnalyses(filtered);
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const formatDateHeader = (dateString) => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      
      if (date.toDateString() === today.toDateString()) {
        return 'Hoje';
      }
      if (date.toDateString() === yesterday.toDateString()) {
        return 'Ontem';
      }
      
      return date.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const groupAnalysesByDate = () => {
    const grouped = {};
    filteredAnalyses.forEach(analysis => {
      const dateKey = formatDate(analysis.createdAt);
      if (dateKey && !grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      if (dateKey) {
        grouped[dateKey].push(analysis);
      }
    });
    return grouped;
  };

  const navigateToResult = (analysis) => {
    if (!analysis || !analysis.id) {
      Alert.alert('Erro', 'Análise inválida. Não é possível visualizar os resultados.');
      return;
    }

    if (analysis.status === 'pending' || analysis.status === 'processing') {
      Alert.alert(
        'Análise em andamento',
        'Esta análise ainda está sendo processada. Tente novamente em alguns instantes.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (analysis.status === 'failed') {
      Alert.alert(
        'Análise com erro',
        'Esta análise falhou durante o processamento. Tente reprocessá-la.',
        [{ text: 'OK' }]
      );
      return;
    }

    navigation.navigate('AnalysisResult', { 
      analysis: analysis,
      analysisId: analysis.id
    });
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'completed': 
        return { color: '#10B981', bg: '#ECFDF5', text: 'Concluída', icon: 'check-circle' };
      case 'processing': 
        return { color: '#F59E0B', bg: '#FFFBEB', text: 'Processando', icon: 'schedule' };
      case 'pending': 
        return { color: '#6B7280', bg: '#F9FAFB', text: 'Pendente', icon: 'hourglass-empty' };
      case 'failed': 
        return { color: '#EF4444', bg: '#FEF2F2', text: 'Erro', icon: 'error' };
      default: 
        return { color: '#6B7280', bg: '#F9FAFB', text: 'Desconhecido', icon: 'help' };
    }
  };

  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'high':
        return { color: '#EF4444', bg: '#FEF2F2', text: 'Alta' };
      case 'medium':
        return { color: '#F59E0B', bg: '#FFFBEB', text: 'Média' };
      case 'low':
        return { color: '#10B981', bg: '#ECFDF5', text: 'Baixa' };
      default:
        return { color: '#6B7280', bg: '#F9FAFB', text: 'Normal' };
    }
  };

  const AnalysisCard = ({ analysis, index }) => {
    const statusConfig = getStatusConfig(analysis.status);
    const priorityConfig = getPriorityConfig(analysis.priority);
    const [cardAnim] = useState(new Animated.Value(0));

    useEffect(() => {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View style={[
        styles.analysisCard,
        {
          opacity: cardAnim,
          transform: [{
            translateY: cardAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0]
            })
          }]
        }
      ]}>
        <TouchableOpacity 
          style={styles.cardTouchable}
          onPress={() => navigateToResult(analysis)}
          disabled={!analysis.id}
          activeOpacity={0.7}
        >
          {/* Header do Card */}
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.priorityDot, { backgroundColor: priorityConfig.color }]} />
              <Text style={styles.cardTitle} numberOfLines={1}>
                {analysis.diagnosis || analysis.title || 'Diagnóstico não especificado'}
              </Text>
            </View>
            
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Icon name={statusConfig.icon} size={12} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.text}
              </Text>
            </View>
          </View>

          {/* Informações do Paciente */}
          <View style={styles.patientInfo}>
            <Icon name="person" size={16} color="#6B7280" />
            <Text style={styles.patientName}>
              {analysis.patient?.name || 'Análise geral'}
            </Text>
            <Text style={styles.cardTime}>
              {formatDate(analysis.createdAt)} • {formatTime(analysis.createdAt)}
            </Text>
          </View>

          {/* Sintomas */}
          {analysis.symptoms && (
            <Text style={styles.symptomsText} numberOfLines={2}>
              {analysis.symptoms}
            </Text>
          )}

          {/* Footer do Card */}
          <View style={styles.cardFooter}>
            <View style={styles.cardStats}>
              {analysis.confidence && (
                <View style={styles.confidenceBadge}>
                  <Icon name="psychology" size={14} color="#3B82F6" />
                  <Text style={styles.confidenceText}>{analysis.confidence}%</Text>
                </View>
              )}
              
              {analysis.imagesCount > 0 && (
                <View style={styles.statItem}>
                  <Icon name="image" size={14} color="#6B7280" />
                  <Text style={styles.statText}>{analysis.imagesCount}</Text>
                </View>
              )}
              
              {analysis.resultsCount > 0 && (
                <View style={styles.statItem}>
                  <Icon name="assignment" size={14} color="#6B7280" />
                  <Text style={styles.statText}>{analysis.resultsCount}</Text>
                </View>
              )}
            </View>
            
            <Icon name="chevron-right" size={20} color="#9CA3AF" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner}>
            <ActivityIndicator size="large" color="#667EEA" />
          </View>
          <Text style={styles.loadingText}>Carregando histórico...</Text>
          <Text style={styles.loadingSubtext}>Organizando suas análises</Text>
        </View>
      </View>
    );
  }

  const groupedAnalyses = groupAnalysesByDate();
  const dateKeys = Object.keys(groupedAnalyses).sort((a, b) => {
    try {
      return new Date(b.split('/').reverse().join('-')) - new Date(a.split('/').reverse().join('-'));
    } catch {
      return 0;
    }
  });

  const totalAnalyses = filteredAnalyses.length;
  const completedAnalyses = filteredAnalyses.filter(a => a.status === 'completed').length;

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
              <Text style={styles.headerTitleText}>Histórico</Text>
              <Text style={styles.headerSubtitle}>
                {totalAnalyses} análise{totalAnalyses !== 1 ? 's' : ''} • {completedAnalyses} concluída{completedAnalyses !== 1 ? 's' : ''}
              </Text>
            </View>
            
            <TouchableOpacity style={styles.filterButton}>
              <Icon name="filter-list" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      {/* Search Bar Premium */}
      <Animated.View style={[
        styles.searchSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por diagnóstico, paciente ou data..."
              placeholderTextColor="#9CA3AF"
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Icon name="close" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#667EEA']}
            tintColor="#667EEA"
            progressBackgroundColor="#FFFFFF"
          />
        }
      >
        {dateKeys.length === 0 ? (
          <Animated.View style={[
            styles.emptyContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}>
            <View style={styles.emptyIconContainer}>
              <Icon name="history" size={80} color="#E2E8F0" />
            </View>
            <Text style={styles.emptyTitle}>
              {searchText ? 'Nenhum resultado encontrado' : 'Sem análises ainda'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchText 
                ? 'Tente ajustar os termos da sua busca' 
                : 'Suas análises aparecerão aqui quando você começar a usar o EYA'
              }
            </Text>
            {!searchText && (
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => navigation.navigate('Analysis')}
              >
                <Icon name="add" size={20} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Fazer primeira análise</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        ) : (
          dateKeys.map(dateKey => (
            <View key={dateKey} style={styles.dateSection}>
              <View style={styles.dateSectionHeader}>
                <Text style={styles.dateHeader}>
                  {groupedAnalyses[dateKey]?.[0] ? 
                    formatDateHeader(groupedAnalyses[dateKey][0].createdAt) : 
                    dateKey
                  }
                </Text>
                <Text style={styles.dateCount}>
                  {groupedAnalyses[dateKey].length} análise{groupedAnalyses[dateKey].length !== 1 ? 's' : ''}
                </Text>
              </View>
              
              {groupedAnalyses[dateKey].map((analysis, index) => (
                <AnalysisCard key={analysis.id} analysis={analysis} index={index} />
              ))}
            </View>
          ))
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <Animated.View style={[
        styles.fabContainer,
        {
          opacity: fadeAnim,
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [100, 0]
            })
          }]
        }
      ]}>
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('Analysis')}
          activeOpacity={0.8}
        >
          <View style={styles.fabGradient} />
          <View style={styles.fabContent}>
            <Icon name="psychology" size={24} color="#FFFFFF" />
            <Text style={styles.fabText}>Nova Análise</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default HistoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Header Premium
  headerContainer: {
    height: 140,
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
    justifyContent: 'center',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search Section
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '400',
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
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

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#F1F5F9',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#667EEA',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#667EEA',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Date Section
  dateSection: {
    marginBottom: 24,
  },
  dateSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  dateCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  // Analysis Card
  analysisCard: {
    marginBottom: 12,
  },
  cardTouchable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  cardTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 'auto',
  },
  symptomsText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
  },
  fab: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#667EEA',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  fabGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#667EEA',
    background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
  },
  fabContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fabText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});