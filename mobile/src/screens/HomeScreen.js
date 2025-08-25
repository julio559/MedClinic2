import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Alert,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  const [stats, setStats] = useState({
    totalAnalyses: 0,
    completedAnalyses: 0,
    processingAnalyses: 0,
    totalPatients: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    // Animação de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadDashboardData = async () => {
    try {
      const statsResponse = await axios.get('/users/stats');
      setStats(statsResponse.data || {});
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const chartData = useMemo(() => {
    const completed = Number(stats.completedAnalyses || 0);
    const processing = Number(stats.processingAnalyses || 0);
    const total = Number(stats.totalAnalyses || 0);
    const other = Math.max(total - (completed + processing), 0);
    const maxVal = Math.max(completed, processing, other, 1);
    return { completed, processing, other, maxVal };
  }, [stats]);

  const completionRate = useMemo(() => {
    const total = Number(stats.totalAnalyses || 0);
    const completed = Number(stats.completedAnalyses || 0);
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  }, [stats]);

  const navigateToHistory = () => navigation.navigate('History');
  const navigateToNewAnalysis = () => navigation.navigate('Analysis');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header Premium com Gradient */}
      <View style={styles.headerContainer}>
        <View style={styles.headerGradient} />
        <View style={styles.headerBlur} />
        
        <Animated.View style={[
          styles.headerContent,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.headerTop}>
            <View style={styles.userInfo}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarGlow} />
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(user?.name || 'Usuário').split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </Text>
                </View>
                <View style={styles.onlineIndicator} />
              </View>
              
              <View style={styles.welcomeSection}>
                <Text style={styles.timeGreeting}>
                  {new Date().getHours() < 12 ? 'Bom dia' : 
                   new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite'}
                </Text>
                <Text style={styles.doctorName}>{user?.name || 'Dr(a). Usuário'}</Text>
                <Text style={styles.crmInfo}>CRM {user?.crm || '—'} • Cardiologista</Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.notificationButton}>
              <View style={styles.notificationIconBg}>
                <Icon name="notifications-none" size={22} color="#FFFFFF" />
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationCount}>3</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
          
          {/* Quick Stats no Header */}
          <View style={styles.headerStats}>
            <View style={styles.headerStatItem}>
              <Text style={styles.headerStatValue}>{stats.totalAnalyses || 0}</Text>
              <Text style={styles.headerStatLabel}>Análises</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStatItem}>
              <Text style={styles.headerStatValue}>{completionRate}%</Text>
              <Text style={styles.headerStatLabel}>Conclusão</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStatItem}>
              <Text style={styles.headerStatValue}>{stats.totalPatients || 0}</Text>
              <Text style={styles.headerStatLabel}>Pacientes</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      <ScrollView
        style={styles.mainContent}
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
        {/* Hero Actions */}
        <Animated.View style={[
          styles.heroSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <TouchableOpacity style={styles.primaryHeroButton} onPress={navigateToNewAnalysis}>
            <View style={styles.heroButtonGradient} />
            <View style={styles.heroButtonContent}>
              <View style={styles.heroIconContainer}>
                <Icon name="add" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.heroTextContainer}>
                <Text style={styles.heroButtonTitle}>Nova Análise</Text>
                <Text style={styles.heroButtonSubtitle}>Iniciar diagnóstico completo</Text>
              </View>
              <Icon name="arrow-forward" size={24} color="rgba(255, 255, 255, 0.8)" />
            </View>
          </TouchableOpacity>
          
          <View style={styles.secondaryActionsRow}>
            <TouchableOpacity style={styles.secondaryAction} onPress={navigateToHistory}>
              <View style={styles.secondaryActionIcon}>
                <Icon name="history" size={24} color="#667EEA" />
              </View>
              <Text style={styles.secondaryActionText}>Histórico</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryAction}>
              <View style={styles.secondaryActionIcon}>
                <Icon name="analytics" size={24} color="#10B981" />
              </View>
              <Text style={styles.secondaryActionText}>Relatórios</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryAction}>
              <View style={styles.secondaryActionIcon}>
                <Icon name="people" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.secondaryActionText}>Pacientes</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Performance Dashboard */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Performance</Text>
            <TouchableOpacity style={styles.sectionAction}>
              <Text style={styles.sectionActionText}>Ver tudo</Text>
              <Icon name="chevron-right" size={16} color="#667EEA" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.performanceGrid}>
            <MetricCard
              title="Taxa de Sucesso"
              value={`${completionRate}%`}
              trend="+12%"
              trendUp={true}
              icon="trending-up"
              gradient={['#667EEA', '#764BA2']}
            />
            
            <MetricCard
              title="Tempo Médio"
              value="2.3h"
              trend="-8min"
              trendUp={true}
              icon="schedule"
              gradient={['#F093FB', '#F5576C']}
            />
            
            <MetricCard
              title="Análises/Dia"
              value="8.5"
              trend="+2.1"
              trendUp={true}
              icon="assessment"
              gradient={['#4FACFE', '#00F2FE']}
            />
            
            <MetricCard
              title="Satisfação"
              value="4.8"
              trend="+0.2"
              trendUp={true}
              icon="star"
              gradient={['#43E97B', '#38F9D7']}
            />
          </View>
        </View>

        {/* Advanced Analytics Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Análise Detalhada</Text>
          
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Distribuição de Status</Text>
                <Text style={styles.chartSubtitle}>Últimos 30 dias</Text>
              </View>
              <View style={styles.chartPeriodSelector}>
                <Text style={styles.periodText}>30D</Text>
                <Icon name="keyboard-arrow-down" size={20} color="#6B7280" />
              </View>
            </View>
            
            <AdvancedBarChart data={chartData} />
            
            <View style={styles.chartFooter}>
              <View style={styles.chartLegendGrid}>
                <ChartLegendItem
                  color="#10B981"
                  label="Concluídas"
                  value={chartData.completed}
                  percentage={chartData.maxVal > 0 ? Math.round((chartData.completed / chartData.maxVal) * 100) : 0}
                />
                <ChartLegendItem
                  color="#F59E0B"
                  label="Processando"
                  value={chartData.processing}
                  percentage={chartData.maxVal > 0 ? Math.round((chartData.processing / chartData.maxVal) * 100) : 0}
                />
                <ChartLegendItem
                  color="#EF4444"
                  label="Pendentes"
                  value={chartData.other}
                  percentage={chartData.maxVal > 0 ? Math.round((chartData.other / chartData.maxVal) * 100) : 0}
                />
              </View>
            </View>
          </View>
        </View>

        {/* AI Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insights Inteligentes</Text>
          
          <View style={styles.insightsContainer}>
            <InsightCard
              type="success"
              title="Performance Excepcional"
              description="Sua taxa de conclusão está 15% acima da média dos especialistas"
              action="Ver detalhes"
              icon="emoji-events"
            />
            
            <InsightCard
              type="info"
              title="Oportunidade Identificada"
              description="3 pacientes podem se beneficiar de análises de acompanhamento"
              action="Revisar casos"
              icon="lightbulb"
            />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// Componente MetricCard Premium
const MetricCard = ({ title, value, trend, trendUp, icon, gradient }) => (
  <View style={styles.metricCard}>
    <View style={[styles.metricGradient, { 
      background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
      backgroundColor: gradient[0] 
    }]} />
    
    <View style={styles.metricContent}>
      <View style={styles.metricHeader}>
        <View style={styles.metricIconContainer}>
          <Icon name={icon} size={20} color="#FFFFFF" />
        </View>
        <View style={[styles.trendBadge, { backgroundColor: trendUp ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }]}>
          <Icon 
            name={trendUp ? "trending-up" : "trending-down"} 
            size={12} 
            color={trendUp ? "#10B981" : "#EF4444"} 
          />
          <Text style={[styles.trendText, { color: trendUp ? "#10B981" : "#EF4444" }]}>
            {trend}
          </Text>
        </View>
      </View>
      
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
  </View>
);

// Componente AdvancedBarChart
const AdvancedBarChart = ({ data }) => {
  const maxHeight = 120;
  
  const getBarHeight = (value) => {
    if (data.maxVal === 0) return 8;
    return Math.max(8, (value / data.maxVal) * maxHeight);
  };

  const getBarWidth = () => {
    return (width - 80) / 3 - 20;
  };

  return (
    <View style={styles.advancedChart}>
      <View style={styles.chartBars}>
        <AdvancedBar 
          height={getBarHeight(data.completed)}
          width={getBarWidth()}
          color="#10B981"
          value={data.completed}
          label="Concluídas"
          delay={0}
        />
        <AdvancedBar 
          height={getBarHeight(data.processing)}
          width={getBarWidth()}
          color="#F59E0B"
          value={data.processing}
          label="Processando"
          delay={200}
        />
        <AdvancedBar 
          height={getBarHeight(data.other)}
          width={getBarWidth()}
          color="#EF4444"
          value={data.other}
          label="Pendentes"
          delay={400}
        />
      </View>
    </View>
  );
};

// Componente AdvancedBar com animação
const AdvancedBar = ({ height, width, color, value, label, delay }) => {
  const [animHeight] = useState(new Animated.Value(8));

  useEffect(() => {
    Animated.timing(animHeight, {
      toValue: height,
      duration: 800,
      delay: delay,
      useNativeDriver: false,
    }).start();
  }, [height]);

  return (
    <View style={[styles.advancedBarContainer, { width }]}>
      <View style={styles.barWrapper}>
        <Animated.View style={[
          styles.advancedBar,
          {
            height: animHeight,
            backgroundColor: color,
            width: width * 0.6,
          }
        ]} />
        <View style={[styles.barGlow, { backgroundColor: color, width: width * 0.6 }]} />
      </View>
      <Text style={styles.barValue}>{value}</Text>
      <Text style={styles.barLabel}>{label}</Text>
    </View>
  );
};

// Componente ChartLegendItem
const ChartLegendItem = ({ color, label, value, percentage }) => (
  <View style={styles.legendItem}>
    <View style={styles.legendHeader}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
    <Text style={styles.legendValue}>{value}</Text>
    <Text style={styles.legendPercentage}>{percentage}%</Text>
  </View>
);

// Componente InsightCard
const InsightCard = ({ type, title, description, action, icon }) => (
  <View style={[styles.insightCard, styles[`insight${type.charAt(0).toUpperCase() + type.slice(1)}`]]}>
    <View style={styles.insightIcon}>
      <Icon name={icon} size={24} color={type === 'success' ? "#10B981" : "#3B82F6"} />
    </View>
    <View style={styles.insightContent}>
      <Text style={styles.insightTitle}>{title}</Text>
      <Text style={styles.insightDescription}>{description}</Text>
      <TouchableOpacity style={styles.insightAction}>
        <Text style={[styles.insightActionText, { color: type === 'success' ? "#10B981" : "#3B82F6" }]}>
          {action}
        </Text>
        <Icon name="arrow-forward" size={16} color={type === 'success' ? "#10B981" : "#3B82F6"} />
      </TouchableOpacity>
    </View>
  </View>
);

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Header Premium
headerContainer: {
  // altura do header + área segura do topo
  height: 280 + (Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 44),
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
  headerBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
  },
headerContent: {
  flex: 1,
  // padding que considera o StatusBar no Android e o notch no iOS
  paddingTop: Platform.OS === 'android'
    ? ((StatusBar.currentHeight || 0) + 20)
    : (44 + 12),
  paddingHorizontal: 20,
  paddingBottom: 20,
},
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatarGlow: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    opacity: 0.1,
    top: -5,
    left: -5,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  welcomeSection: {
    flex: 1,
  },
  timeGreeting: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  doctorName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  crmInfo: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  notificationButton: {
    padding: 4,
  },
  notificationIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    backdropFilter: 'blur(10px)',
  },
  headerStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  headerStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  headerStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 16,
  },

  // Main Content
  mainContent: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
  },

  // Hero Section
  heroSection: {
    paddingTop: 30,
    marginBottom: 30,
  },
  primaryHeroButton: {
    height: 80,
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#667EEA',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  heroButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#667EEA',
    background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
  },
  heroButtonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  heroIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  heroTextContainer: {
    flex: 1,
  },
  heroButtonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  heroButtonSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  secondaryActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },

  // Section
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667EEA',
  },

  // Performance Grid
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: (width - 52) / 2,
    height: 120,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
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
  metricGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  metricContent: {
    flex: 1,
    padding: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  metricIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },

  // Chart Card
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  chartPeriodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  periodText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  advancedChart: {
    marginBottom: 24,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 140,
  },
  advancedBarContainer: {
    alignItems: 'center',
  },
  barWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 120,
    marginBottom: 12,
  },
  advancedBar: {
    borderRadius: 8,
    minHeight: 8,
    position: 'relative',
  },
  barGlow: {
    position: 'absolute',
    bottom: 0,
    borderRadius: 8,
    opacity: 0.3,
    height: 4,
  },
  barValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  chartFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 20,
  },
  chartLegendGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    alignItems: 'center',
    flex: 1,
  },
  legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
  },
  legendPercentage: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },

  // Insights
  insightsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  insightCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 140,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  insightSuccess: {
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
    backgroundColor: '#070f0dff',
  },
  insightInfo: {
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
    backgroundColor: '#FAFBFF',
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  insightContent: {
    flex: 1,
    width: '100%',
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
    lineHeight: 18,
  },
  insightDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 8,
  },
  insightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  insightActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});