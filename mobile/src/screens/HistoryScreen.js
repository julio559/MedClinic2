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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';

const HistoryScreen = ({ navigation }) => {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredAnalyses, setFilteredAnalyses] = useState([]);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  useEffect(() => {
    filterAnalyses();
  }, [searchText, analyses]);

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/analysis/recent');
      
      // A API retorna um array de análises
      const analysesData = response.data || [];
      setAnalyses(analysesData);
      
    } catch (error) {
      console.error('Erro ao buscar análises:', error);
      
      // Se der erro na API, define array vazio para parar o loading
      setAnalyses([]);
      
      // Só mostra alerta se não for erro de conexão simples
      if (error.response && error.response.status !== 404) {
        Alert.alert('Erro', 'Falha ao carregar histórico de análises');
      }
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

    const filtered = analyses.filter(analysis => 
      analysis.title?.toLowerCase().includes(searchText.toLowerCase()) ||
      analysis.description?.toLowerCase().includes(searchText.toLowerCase()) ||
      analysis.symptoms?.toLowerCase().includes(searchText.toLowerCase()) ||
      formatDate(analysis.createdAt).includes(searchText)
    );
    setFilteredAnalyses(filtered);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateHeader = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const groupAnalysesByDate = () => {
    const grouped = {};
    filteredAnalyses.forEach(analysis => {
      const dateKey = formatDate(analysis.createdAt);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(analysis);
    });
    return grouped;
  };

  const navigateToResult = (analysis) => {
    navigation.navigate('AnalysisResult', { analysisId: analysis.id });
  };

  const getAnalysisTitle = (analysis) => {
    // Tentar extrair o diagnóstico principal dos resultados
    if (analysis.AnalysisResults && analysis.AnalysisResults.length > 0) {
      const mainDiagnosis = analysis.AnalysisResults.find(
        result => result.category === 'Diagnostico principal' || result.category === 'Diagnóstico principal'
      );
      if (mainDiagnosis) {
        return mainDiagnosis.result;
      }
    }
    
    // Fallback para título da análise
    return analysis.title || 'Análise sem título';
  };

  const getAnalysisPreview = (analysis) => {
    // Usar descrição ou sintomas como preview
    if (analysis.description) {
      return analysis.description;
    }
    if (analysis.symptoms) {
      return `Sintomas: ${analysis.symptoms}`;
    }
    return 'Clique para ver detalhes';
  };

  const AnalysisItem = ({ analysis }) => (
    <TouchableOpacity 
      style={styles.analysisItem}
      onPress={() => navigateToResult(analysis)}
    >
      <View style={styles.analysisContent}>
        <Text style={styles.analysisTitle} numberOfLines={1}>
          {getAnalysisTitle(analysis)}
        </Text>
        <Text style={styles.analysisTime}>
          {formatDate(analysis.createdAt)} • {formatTime(analysis.createdAt)}
        </Text>
        <Text style={styles.analysisSymptoms} numberOfLines={2}>
          {getAnalysisPreview(analysis)}
        </Text>
        
        {/* Status da análise */}
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusDot,
            { backgroundColor: analysis.status === 'completed' ? '#10B981' : analysis.status === 'processing' ? '#F59E0B' : '#EF4444' }
          ]} />
          <Text style={styles.statusText}>
            {analysis.status === 'completed' ? 'Concluída' : 
             analysis.status === 'processing' ? 'Processando' : 'Pendente'}
          </Text>
        </View>
      </View>
      <Icon name="chevron-right" size={24} color="#64748b" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Histórico de análises EYA</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e40af" />
          <Text style={styles.loadingText}>Carregando histórico...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const groupedAnalyses = groupAnalysesByDate();
  const dateKeys = Object.keys(groupedAnalyses).sort((a, b) => {
    return new Date(b.split('/').reverse().join('-')) - new Date(a.split('/').reverse().join('-'));
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Histórico de análises EYA</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquise por tópico ou data"
          placeholderTextColor="#64748b"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {dateKeys.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="history" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Nenhuma análise encontrada</Text>
            <Text style={styles.emptySubtitle}>
              {searchText ? 'Tente uma pesquisa diferente' : 'Você ainda não fez nenhuma análise. Comece criando uma nova análise!'}
            </Text>
            {!searchText && (
              <TouchableOpacity 
                style={styles.emptyActionButton}
                onPress={() => navigation.navigate('Analysis')}
              >
                <Icon name="add" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.emptyActionText}>Criar Primeira Análise</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          dateKeys.map(dateKey => (
            <View key={dateKey} style={styles.dateSection}>
              <Text style={styles.dateHeader}>
                {formatDateHeader(groupedAnalyses[dateKey][0].createdAt)}
              </Text>
              {groupedAnalyses[dateKey].map(analysis => (
                <AnalysisItem key={analysis.id} analysis={analysis} />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Floating Action Button */}
      {dateKeys.length > 0 && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('Analysis')}
        >
          <Text style={styles.fabText}>Pergunte a EYA</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    margin: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 25,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748b',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyActionButton: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dateSection: {
    marginBottom: 30,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 20,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginRight: 20,
  },
  analysisItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginHorizontal: 20,
    marginBottom: 2,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  analysisContent: {
    flex: 1,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  analysisTime: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  analysisSymptoms: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#1e293b',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HistoryScreen;