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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();

  const [stats, setStats] = useState({
    totalAnalyses: 0,
    completedAnalyses: 0,
    processingAnalyses: 0,
    totalPatients: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
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

  // Derivados p/ gráfico de barras
  const chartData = useMemo(() => {
    const completed = Number(stats.completedAnalyses || 0);
    const processing = Number(stats.processingAnalyses || 0);
    const total = Number(stats.totalAnalyses || 0);
    const other = Math.max(total - (completed + processing), 0); // pendentes/failed
    const maxVal = Math.max(completed, processing, other, 1);
    return { completed, processing, other, maxVal };
  }, [stats]);

  const patientsPerAnalysisPct = useMemo(() => {
    const totalA = Number(stats.totalAnalyses || 0);
    const totalP = Number(stats.totalPatients || 0);
    if (totalP === 0 && totalA === 0) return 0;
    const ratio = totalP ? Math.min(totalA / (totalP || 1), 1) : (totalA > 0 ? 1 : 0);
    return Math.round(ratio * 100);
  }, [stats]);

  const navigateToHistory = () => navigation.navigate('History');
  const navigateToNewAnalysis = () => navigation.navigate('Analysis');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />

      {/* Header com info do médico */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.settingsButton} onPress={() => Alert.alert('Configurações', 'Em breve')}>
          <Icon name="settings" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.doctorContainer}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Icon name="person" size={60} color="#8B5A2B" />
            </View>
          </View>
          <Text style={styles.doctorName}>{user?.name || 'Dr(a). Usuário'}</Text>
          <Text style={styles.crmNumber}>CRM {user?.crm || '—'}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.mainContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Nova Análise */}
        <TouchableOpacity style={styles.newAnalysisButton} onPress={navigateToNewAnalysis}>
          <Text style={styles.newAnalysisText}>Nova Análise</Text>
        </TouchableOpacity>

        {/* Resumo / KPIs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo</Text>

          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <View style={styles.kpiIconWrap}>
                <Icon name="description" size={18} color="#1E3A8A" />
              </View>
              <Text style={styles.kpiLabel}>Análises</Text>
              <Text style={styles.kpiValue}>{stats.totalAnalyses || 0}</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiIconWrap}>
                <Icon name="check-circle" size={18} color="#059669" />
              </View>
              <Text style={styles.kpiLabel}>Concluídas</Text>
              <Text style={styles.kpiValue}>{stats.completedAnalyses || 0}</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiIconWrap}>
                <Icon name="hourglass-bottom" size={18} color="#7C3AED" />
              </View>
              <Text style={styles.kpiLabel}>Processando</Text>
              <Text style={styles.kpiValue}>{stats.processingAnalyses || 0}</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiIconWrap}>
                <Icon name="people" size={18} color="#2563EB" />
              </View>
              <Text style={styles.kpiLabel}>Pacientes</Text>
              <Text style={styles.kpiValue}>{stats.totalPatients || 0}</Text>
            </View>
          </View>
        </View>

        {/* Gráfico: Status das análises (BARRAS) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status das análises</Text>

          <View style={styles.chartBox}>
            <View style={styles.chartGrid}>
              <Bar
                label="Concl."
                value={chartData.completed}
                max={chartData.maxVal}
                hint={`${chartData.completed}`}
                color="#059669"
              />
              <Bar
                label="Proc."
                value={chartData.processing}
                max={chartData.maxVal}
                hint={`${chartData.processing}`}
                color="#7C3AED"
              />
              <Bar
                label="Outros"
                value={chartData.other}
                max={chartData.maxVal}
                hint={`${chartData.other}`}
                color="#9CA3AF"
              />
            </View>
          </View>
        </View>

        {/* Proporção Pacientes x Análises (Progress) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cobertura de atendimentos</Text>
          <Text style={styles.progressCaption}>
            Pacientes com pelo menos uma análise (estimativa)
          </Text>

          <View style={styles.progressBarOuter}>
            <View style={[styles.progressBarInner, { width: `${patientsPerAnalysisPct}%` }]} />
          </View>
          <Text style={styles.progressPct}>{patientsPerAnalysisPct}%</Text>
        </View>

        {/* Acesso rápido */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acesso rápido</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity style={styles.quickAction} onPress={navigateToNewAnalysis}>
              <Icon name="add-circle-outline" size={22} color="#1E3A8A" />
              <Text style={styles.quickActionText}>Nova análise</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={navigateToHistory}>
              <Icon name="history" size={22} color="#1E3A8A" />
              <Text style={styles.quickActionText}>Histórico</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
};

/** Barra simples p/ o gráfico (sem libs) */
const Bar = ({ label, value, max, hint, color }) => {
  const maxHeight = 140; // px
  const h = Math.max(6, Math.round((Number(value || 0) / Math.max(max, 1)) * maxHeight));

  return (
    <View style={styles.barCol}>
      <View style={[styles.bar, { height: h, backgroundColor: color }]} />
      <Text style={styles.barHint}>{hint}</Text>
      <Text style={styles.barLabel}>{label}</Text>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },

  header: {
    backgroundColor: '#1E3A8A',
    paddingTop: 50,
    paddingBottom: 40,
    paddingHorizontal: 20,
    position: 'relative',
  },
  settingsButton: { position: 'absolute', top: 50, right: 20, padding: 8 },
  doctorContainer: { alignItems: 'center', marginTop: 20 },
  avatarContainer: { marginBottom: 16 },
  avatar: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: '#F3E8D1',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  doctorName: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  crmNumber: { fontSize: 16, color: 'rgba(255, 255, 255, 0.8)' },

  mainContent: { flex: 1, padding: 20 },

  // Botão Nova Análise
  newAnalysisButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  newAnalysisText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  // Seções
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 },

  // KPIs
  kpiRow: { flexDirection: 'row', gap: 10 },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  kpiIconWrap: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 6,
    marginBottom: 8,
  },
  kpiLabel: { fontSize: 12, color: '#6B7280' },
  kpiValue: { fontSize: 20, fontWeight: '800', color: '#1F2937', marginTop: 2 },

  // Chart (barras)
  chartBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  chartGrid: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 160,
  },
  barCol: { alignItems: 'center', width: 72 },
  bar: { width: 36, borderRadius: 8 },
  barHint: { fontSize: 12, color: '#374151', marginTop: 6 },
  barLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  // Progress
  progressCaption: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  progressBarOuter: {
    height: 14,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    overflow: 'hidden',
  },
  progressBarInner: {
    height: '100%',
    backgroundColor: '#1E3A8A',
    borderRadius: 999,
  },
  progressPct: { marginTop: 6, fontWeight: '700', color: '#1F2937' },

  // Acesso rápido
  quickActionsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1, borderColor: '#F3F4F6',
    justifyContent: 'space-around',
  },
  quickAction: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10 },
  quickActionText: { marginTop: 6, fontSize: 12, color: '#1E3A8A', fontWeight: '700' },
});
