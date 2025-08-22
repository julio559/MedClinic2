import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

const norm = (s = '') =>
  String(s)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

const isDiagPrincipal = (category = '') => {
  const n = norm(category);
  return n.includes('diagnostico principal');
};

const getPrimaryDiagnosis = (analysis) => {
  const results = analysis?.AnalysisResults || [];
  const diag = results.find((r) => isDiagPrincipal(r.category));
  return diag?.result || '';
};

const formatDate = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

const formatTimeAgo = (iso) => {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Agora há pouco';
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Ontem';
    if (diffInDays < 7) return `${diffInDays} dias atrás`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} semanas atrás`;
    
    return formatDate(iso);
  } catch {
    return '';
  }
};

const PatientConditionsScreen = ({ navigation, route }) => {
  const { patient } = route.params;
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

  useEffect(() => {
    load();
    
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
  }, []);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const patientRes = await axios.get(`/patients/${patient.id}`);
      const patientData = patientRes.data || {};
      let baseAnalyses = Array.isArray(patientData.Analyses) ? patientData.Analyses : [];

      if (baseAnalyses.length === 0) {
        try {
          const allRes = await axios.get('/analysis');
          const allAnalyses = allRes.data || [];
          baseAnalyses = allAnalyses.filter((a) => {
            return a.patientId === patient.id || a?.patient?.id === patient.id;
          });
        } catch (e) {
          // Mock data para demonstração
          baseAnalyses = [
            {
              id: 'mock-1',
              title: 'Análise Dermatológica Completa',
              description: 'Avaliação de lesão suspeita',
              status: 'completed',
              createdAt: new Date().toISOString(),
              confidence: 94,
              priority: 'high',
              category: 'Dermatologia',
              AnalysisResults: [
                { category: 'Diagnóstico Principal', result: 'Melanoma in situ' }
              ]
            },
            {
              id: 'mock-2',
              title: 'Análise Preventiva',
              description: 'Check-up de rotina',
              status: 'completed',
              createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
              confidence: 87,
              priority: 'medium',
              category: 'Preventivo',
              AnalysisResults: [
                { category: 'Diagnóstico Principal', result: 'Ceratose Actínica' }
              ]
            },
            {
              id: 'mock-3',
              title: 'Análise Urgente',
              description: 'Lesão com mudança recente',
              status: 'processing',
              createdAt: new Date(Date.now() - 3600000).toISOString(),
              confidence: null,
              priority: 'high',
              category: 'Urgente',
              AnalysisResults: []
            }
          ];
        }
      }

      const detailPromises = baseAnalyses.map(async (a) => {
        try {
          const detail = await axios.get(`/analysis/${a.id}/results`);
          return detail.data;
        } catch (e) {
          return {
            id: a.id,
            title: a.title,
            description: a.description,
            status: a.status,
            createdAt: a.createdAt,
            confidence: a.confidence,
            priority: a.priority,
            category: a.category,
            AnalysisResults: a.AnalysisResults || [],
          };
        }
      });

      const details = await Promise.all(detailPromises);

      const mapped = details
        .map((an) => {
          const diagnosis = getPrimaryDiagnosis(an);
          const name =
            diagnosis?.split('\n')[0]?.slice(0, 80) ||
            an.title ||
            'Análise';

          return {
            id: an.id,
            name,
            description: diagnosis || an.description || '',
            status: an.status,
            createdAt: an.createdAt,
            analysisId: an.id,
            hasResults: (an.AnalysisResults || []).length > 0,
            confidence: an.confidence,
            priority: an.priority,
            category: an.category,
          };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setItems(mapped);
    } catch (e) {
      console.error('Erro ao carregar análises do paciente:', e?.message || e);
      setError('Não foi possível carregar as análises deste paciente.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    const q = norm(searchQuery);
    if (!q) return items;
    return items.filter(
      (it) => norm(it.name).includes(q) || norm(it.description).includes(q)
    );
  }, [items, searchQuery]);

  const navigateToAnalysis = (it) => {
    navigation.navigate('AnalysisResult', { analysisId: it.analysisId });
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'completed': 
        return { 
          color: '#10B981', 
          bg: '#ECFDF5', 
          text: 'Concluída', 
          icon: 'check-circle',
          gradient: ['#10B981', '#059669']
        };
      case 'processing': 
        return { 
          color: '#F59E0B', 
          bg: '#FFFBEB', 
          text: 'Processando', 
          icon: 'schedule',
          gradient: ['#F59E0B', '#D97706']
        };
      case 'pending': 
        return { 
          color: '#6B7280', 
          bg: '#F9FAFB', 
          text: 'Pendente', 
          icon: 'hourglass-empty',
          gradient: ['#6B7280', '#4B5563']
        };
      case 'failed': 
        return { 
          color: '#EF4444', 
          bg: '#FEF2F2', 
          text: 'Erro', 
          icon: 'error',
          gradient: ['#EF4444', '#DC2626']
        };
      default: 
        return { 
          color: '#6B7280', 
          bg: '#F9FAFB', 
          text: 'Desconhecido', 
          icon: 'help',
          gradient: ['#6B7280', '#4B5563']
        };
    }
  };

  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'high':
        return { color: '#EF4444', bg: '#FEF2F2', text: 'Alta Prioridade' };
      case 'medium':
        return { color: '#F59E0B', bg: '#FFFBEB', text: 'Prioridade Média' };
      case 'low':
        return { color: '#10B981', bg: '#ECFDF5', text: 'Baixa Prioridade' };
      default:
        return { color: '#6B7280', bg: '#F9FAFB', text: 'Prioridade Normal' };
    }
  };

  const ConditionCard = ({ item, index }) => {
    const statusConfig = getStatusConfig(item.status);
    const priorityConfig = getPriorityConfig(item.priority);
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
        styles.cardContainer,
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
          style={styles.card} 
          onPress={() => navigateToAnalysis(item)}
          activeOpacity={0.7}
        >
          {/* Status Strip */}
          <View style={[styles.statusStrip, { backgroundColor: statusConfig.color }]} />
          
          {/* Card Content */}
          <View style={styles.cardContent}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.categoryBadge, { backgroundColor: statusConfig.bg }]}>
                  <Icon name={statusConfig.icon} size={16} color={statusConfig.color} />
                </View>
                <View style={styles.cardTitleContainer}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.cardCategory}>
                    {item.category || 'Análise Geral'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.cardHeaderRight}>
                {item.priority && (
                  <View style={[styles.priorityBadge, { backgroundColor: priorityConfig.bg }]}>
                    <View style={[styles.priorityDot, { backgroundColor: priorityConfig.color }]} />
                  </View>
                )}
                <Text style={styles.timeAgo}>{formatTimeAgo(item.createdAt)}</Text>
              </View>
            </View>

            {/* Description */}
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.description || 'Sem descrição disponível'}
            </Text>

            {/* Footer */}
            <View style={styles.cardFooter}>
              <View style={styles.cardFooterLeft}>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                  <Text style={[styles.statusText, { color: statusConfig.color }]}>
                    {statusConfig.text}
                  </Text>
                </View>
                
                {item.confidence && (
                  <View style={styles.confidenceBadge}>
                    <Icon name="psychology" size={14} color="#3B82F6" />
                    <Text style={styles.confidenceText}>{item.confidence}%</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.cardFooterRight}>
                <Icon name="chevron-right" size={20} color="#9CA3AF" />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const completedCount = items.filter(item => item.status === 'completed').length;
  const processingCount = items.filter(item => item.status === 'processing').length;

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner}>
            <ActivityIndicator size="large" color="#667EEA" />
          </View>
          <Text style={styles.loadingText}>Carregando análises...</Text>
          <Text style={styles.loadingSubtext}>Buscando histórico do paciente</Text>
        </View>
      </View>
    );
  }

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
              <Text style={styles.headerTitleText}>Histórico Médico</Text>
              <Text style={styles.headerSubtitle}>
                {items.length} análise{items.length !== 1 ? 's' : ''} encontrada{items.length !== 1 ? 's' : ''}
              </Text>
            </View>
            
            <TouchableOpacity style={styles.moreButton}>
              <Icon name="more-vert" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          {/* Patient Info Card */}
          <View style={styles.patientCard}>
            <View style={styles.patientAvatar}>
              <Text style={styles.patientInitial}>
                {patient.name?.charAt(0)?.toUpperCase() || 'P'}
              </Text>
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{patient.name}</Text>
              <Text style={styles.patientMeta}>
                {completedCount} concluída{completedCount !== 1 ? 's' : ''} • {processingCount} em andamento
              </Text>
            </View>
            <View style={styles.patientBadge}>
              <Icon name="verified-user" size={16} color="#10B981" />
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Search Section */}
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
              placeholder="Buscar por diagnóstico ou descrição..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Content */}
      {error ? (
        <Animated.View style={[
          styles.errorContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.errorIconContainer}>
            <Icon name="error-outline" size={80} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>Erro ao carregar</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={load}>
            <Icon name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : filtered.length > 0 ? (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <ConditionCard item={item} index={index} />}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#667EEA']}
              tintColor="#667EEA"
              progressBackgroundColor="#FFFFFF"
            />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <Animated.View style={[
          styles.emptyContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.emptyIconContainer}>
            <Icon name="description" size={80} color="#E2E8F0" />
          </View>
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'Nenhum resultado encontrado' : 'Sem análises ainda'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery 
              ? 'Tente ajustar os termos da sua busca' 
              : 'Este paciente ainda não possui análises no histórico'
            }
          </Text>
          {!searchQuery && (
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => navigation.navigate('Analysis', { selectedPatient: patient })}
            >
              <Icon name="add" size={20} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Criar primeira análise</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* FAB */}
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
          onPress={() => navigation.navigate('Analysis', { selectedPatient: patient })}
          activeOpacity={0.8}
        >
          <View style={styles.fabGradient} />
          <View style={styles.fabContent}>
            <Icon name="add" size={24} color="#FFFFFF" />
            <Text style={styles.fabText}>Nova Análise</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default PatientConditionsScreen;

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
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    backdropFilter: 'blur(10px)',
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  patientInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  patientMeta: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  patientBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
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

  // Error State
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
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
  errorSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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

  // List
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  // Card
  cardContainer: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
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
  statusStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardContent: {
    padding: 18,
    paddingLeft: 22,
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
    gap: 12,
  },
  categoryBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
    lineHeight: 20,
  },
  cardCategory: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  priorityBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timeAgo: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  cardDesc: {
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
  cardFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
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
    fontSize: 11,
    fontWeight: '700',
    color: '#3B82F6',
  },
  cardFooterRight: {
    padding: 4,
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