// src/screens/PatientConditionsScreen.js
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';

const norm = (s = '') =>
  String(s)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

const isDiagPrincipal = (category = '') => {
  const n = norm(category);
  // cobre: "Diagnóstico Principal", "Diagnostico Principal", variações
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

const PatientConditionsScreen = ({ navigation, route }) => {
  const { patient } = route.params;
  const [items, setItems] = useState([]);         // lista final (sem mock)
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);   // loading inicial
  const [error, setError] = useState(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      // 1) tentar pegar o paciente com suas análises
      const patientRes = await axios.get(`/patients/${patient.id}`);
      const patientData = patientRes.data || {};
      let baseAnalyses = Array.isArray(patientData.Analyses) ? patientData.Analyses : [];

      // 2) fallback: se o backend não incluir Analyses, buscar /analysis e filtrar por patientId
      if (baseAnalyses.length === 0) {
        try {
          const allRes = await axios.get('/analysis');
          const allAnalyses = allRes.data || [];
          baseAnalyses = allAnalyses.filter((a) => {
            // cobre estruturas diferentes (com patientId ou nested patient)
            return a.patientId === patient.id || a?.patient?.id === patient.id;
          });
        } catch (e) {
          // se falhar aqui, manter vazio; não mockar
        }
      }

      // 3) buscar detalhes/resultado real de cada análise em paralelo
      const detailPromises = baseAnalyses.map(async (a) => {
        try {
          const detail = await axios.get(`/analysis/${a.id}/results`);
          return detail.data;
        } catch (e) {
          // não mockar. Retorna apenas o básico já conhecido.
          return {
            id: a.id,
            title: a.title,
            description: a.description,
            status: a.status,
            createdAt: a.createdAt,
            AnalysisResults: [],
          };
        }
      });

      const details = await Promise.all(detailPromises);

      // 4) montar itens mostrados na lista (sem mock)
      const mapped = details
        .map((an) => {
          const diagnosis = getPrimaryDiagnosis(an);
          // "nome" mostrado — se houver diagnóstico, pega a primeira linha/frase curta, senão usa título
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
          };
        })
        // ordenar do mais recente para o mais antigo
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
    // vai direto para a tela de resultados; se estiver "processing",
    // sua AnalysisResultScreen já mostra o aviso "em processamento".
    navigation.navigate('AnalysisResult', { analysisId: it.analysisId });
  };

  const renderStatusChip = (status) => {
    let bg = '#F3F4F6';
    let fg = '#374151';
    if (status === 'completed') {
      bg = '#DCFCE7';
      fg = '#166534';
    } else if (status === 'processing' || status === 'pending') {
      bg = '#E0E7FF';
      fg = '#3730A3';
    } else if (status === 'failed') {
      bg = '#FEE2E2';
      fg = '#991B1B';
    }
    return (
      <View style={[styles.statusChip, { backgroundColor: bg }]}>
        <Text style={[styles.statusChipText, { color: fg }]}>
          {status === 'completed'
            ? 'Concluída'
            : status === 'processing'
            ? 'Processando'
            : status === 'pending'
            ? 'Pendente'
            : 'Falhou'}
        </Text>
      </View>
    );
  };

  const ConditionCard = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigateToAnalysis(item)}>
      <View style={styles.cardLeft}>
        <View style={styles.iconBox}>
          <Icon name="description" size={20} color="#6B7280" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.description || '—'}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>Criada em {formatDate(item.createdAt)}</Text>
            {renderStatusChip(item.status)}
          </View>
        </View>
      </View>
      <Icon name="chevron-right" size={22} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>
        <View style={styles.patientInfo}>
          <View style={styles.avatarContainer}>
            <Icon name="person" size={24} color="#8B5A2B" />
          </View>
          <Text style={styles.patientName}>{patient.name}</Text>
        </View>
      </View>

      {/* Busca */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar diagnóstico/resultado"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Conteúdo */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Carregando análises…</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Icon name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length > 0 ? (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => <ConditionCard item={item} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.centerBox}>
          <Icon name="description" size={56} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Nenhuma análise encontrada</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Tente uma pesquisa diferente.'
              : 'Este paciente ainda não possui análises vinculadas.'}
          </Text>
        </View>
      )}

      {/* Nova Análise */}
      <View style={styles.newAnalysisContainer}>
        <TouchableOpacity
          style={styles.newAnalysisButton}
          onPress={() => navigation.navigate('Analysis', { selectedPatient: patient })}
        >
          <Text style={styles.newAnalysisText}>Nova Análise</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PatientConditionsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: { marginBottom: 16 },
  patientInfo: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F3E8D1', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  patientName: { fontSize: 18, fontWeight: '600', color: '#1F2937' },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E0E7FF', borderRadius: 12, padding: 16, margin: 20,
  },
  searchInput: { flex: 1, fontSize: 16, marginLeft: 12, color: '#6366F1' },

  listContainer: { paddingHorizontal: 20, paddingBottom: 160 },

  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  errorText: { marginTop: 12, fontSize: 14, color: '#EF4444', textAlign: 'center' },
  retryBtn: {
    marginTop: 12, backgroundColor: '#1E3A8A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
  },
  retryText: { color: '#fff', fontWeight: '600' },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 0, padding: 16, marginBottom: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  iconBox: {
    width: 40, height: 40, borderRadius: 8, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  cardDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  metaRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaText: { fontSize: 12, color: '#9CA3AF' },

  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusChipText: { fontSize: 11, fontWeight: '700' },

  newAnalysisContainer: { position: 'absolute', bottom: 30, left: 20, right: 20 },
  newAnalysisButton: {
    backgroundColor: '#1E3A8A', borderRadius: 12, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 8,
  },
  newAnalysisText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
