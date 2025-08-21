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
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const HistoryScreen = ({ navigation }) => {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredAnalyses, setFilteredAnalyses] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchAnalyses();
    }
  }, [user]);

  useEffect(() => {
    filterAnalyses();
  }, [searchText, analyses]);

  const fetchAnalyses = async () => {
    try {
      const response = await axios.get('/analysis');
      console.log('Analyses response:', response.data);
      setAnalyses(response.data || []);
    } catch (error) {
      console.error('Erro ao buscar análises:', error);
      // Mock data para desenvolvimento
      setAnalyses([
        {
          id: '1',
          diagnosis: 'Possível Psoríase com Superinfecção Bacteriana',
          symptoms: 'Lesão eritematosa com descamação',
          description: 'Paciente apresenta lesões características',
          status: 'completed',
          createdAt: new Date().toISOString(),
          patient: { name: 'João Silva' }
        },
        {
          id: '2',
          diagnosis: 'Dermatite Atópica',
          symptoms: 'Coceira e vermelhidão',
          description: 'Quadro típico de dermatite',
          status: 'completed',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          patient: { name: 'Maria Santos' }
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

    const filtered = analyses.filter(analysis => 
      analysis.diagnosis?.toLowerCase().includes(searchText.toLowerCase()) ||
      analysis.symptoms?.toLowerCase().includes(searchText.toLowerCase()) ||
      analysis.patient?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      formatDate(analysis.createdAt).includes(searchText)
    );
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
    navigation.navigate('AnalysisResult', { analysis });
  };

  const AnalysisItem = ({ analysis }) => (
    <TouchableOpacity 
      style={styles.analysisItem}
      onPress={() => navigateToResult(analysis)}
    >
      <View style={styles.analysisContent}>
        <Text style={styles.analysisTitle} numberOfLines={1}>
          {analysis.diagnosis || 'Diagnóstico não especificado'}
        </Text>
        <Text style={styles.analysisTime}>
          {formatDate(analysis.createdAt)} • {formatTime(analysis.createdAt)}
        </Text>
        {analysis.patient?.name && (
          <Text style={styles.analysisPatient}>
            Paciente: {analysis.patient.name}
          </Text>
        )}
        {analysis.symptoms && (
          <Text style={styles.analysisSymptoms} numberOfLines={2}>
            {analysis.symptoms}
          </Text>
        )}
      </View>
      <Icon name="chevron-right" size={24} color="#64748b" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
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
    try {
      return new Date(b.split('/').reverse().join('-')) - new Date(a.split('/').reverse().join('-'));
    } catch {
      return 0;
    }
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
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
              {searchText ? 'Tente uma pesquisa diferente' : 'Você ainda não fez nenhuma análise'}
            </Text>
          </View>
        ) : (
          dateKeys.map(dateKey => (
            <View key={dateKey} style={styles.dateSection}>
              <Text style={styles.dateHeader}>
                {groupedAnalyses[dateKey]?.[0] ? 
                  formatDateHeader(groupedAnalyses[dateKey][0].createdAt) : 
                  dateKey
                }
              </Text>
              {groupedAnalyses[dateKey].map(analysis => (
                <AnalysisItem key={analysis.id} analysis={analysis} />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('Analysis')}
      >
        <Text style={styles.fabText}>Pergunte a EYA</Text>
      </TouchableOpacity>
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748b',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 40,
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
  analysisPatient: {
    fontSize: 13,
    color: '#3b82f6',
    marginBottom: 4,
  },
  analysisSymptoms: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 18,
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