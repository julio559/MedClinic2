import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';

const PatientConditionsScreen = ({ navigation, route }) => {
  const { patient } = route.params;
  const [conditions, setConditions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPatientConditions();
  }, []);

  const loadPatientConditions = async () => {
    try {
      // Buscar análises do paciente da API
      const response = await axios.get(`/patients/${patient.id}`);
      
      // Extrair condições/diagnósticos das análises
      const patientData = response.data;
      const patientConditions = [];
      
      if (patientData.Analyses && patientData.Analyses.length > 0) {
        // Para cada análise, buscar os resultados completos
        for (const analysis of patientData.Analyses) {
          try {
            const analysisResponse = await axios.get(`/analysis/${analysis.id}/results`);
            const fullAnalysis = analysisResponse.data;
            
            if (fullAnalysis.AnalysisResults && fullAnalysis.AnalysisResults.length > 0) {
              fullAnalysis.AnalysisResults.forEach(result => {
                if (result.category === 'Diagnóstico principal' || result.category === 'Diagnostico principal') {
                  patientConditions.push({
                    id: fullAnalysis.id,
                    name: result.result.split(' ')[0] || 'Diagnóstico',
                    description: result.result,
                    status: fullAnalysis.status,
                    analysisId: fullAnalysis.id,
                    createdAt: fullAnalysis.createdAt
                  });
                }
              });
            } else {
              // Se não tem resultados ainda, adiciona a análise como pendente
              patientConditions.push({
                id: analysis.id,
                name: analysis.title || 'Análise em Processamento',
                description: analysis.description || 'Análise ainda sendo processada',
                status: analysis.status,
                analysisId: analysis.id,
                createdAt: analysis.createdAt
              });
            }
          } catch (analysisError) {
            console.error('Error loading analysis details:', analysisError);
            // Adiciona análise mesmo com erro
            patientConditions.push({
              id: analysis.id,
              name: analysis.title || 'Análise',
              description: analysis.description || 'Clique para ver detalhes',
              status: analysis.status,
              analysisId: analysis.id,
              createdAt: analysis.createdAt
            });
          }
        }
      }
      
      setConditions(patientConditions);
    } catch (error) {
      console.error('Error loading patient conditions:', error);
      setConditions([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPatientConditions();
    setRefreshing(false);
  };

  const filteredConditions = conditions.filter(condition =>
    condition.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    condition.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // CORREÇÃO: Navegar para PatientDetailScreen passando a análise específica
  const navigateToPatientDetail = (condition) => {
    navigation.navigate('PatientDetail', { 
      patient, 
      analysisId: condition.analysisId
    });
  };

  const navigateToNewAnalysis = () => {
    console.log('Navigating with patient:', patient);
    navigation.navigate('Analysis', { selectedPatient: patient });
  };

  const ConditionCard = ({ condition }) => (
    <TouchableOpacity 
      style={styles.conditionCard}
      onPress={() => navigateToPatientDetail(condition)}
    >
      <View style={styles.conditionInfo}>
        <View style={styles.iconContainer}>
          <Icon name="description" size={20} color="#6B7280" />
        </View>
        <Text style={styles.conditionName}>{condition.name}</Text>
      </View>
      <Icon name="chevron-right" size={20} color="#9CA3AF" />
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

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisa por tratamento"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Conditions List */}
      {filteredConditions.length > 0 ? (
        <FlatList
          data={filteredConditions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ConditionCard condition={item} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="description" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Nenhuma análise encontrada</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery ? 'Tente uma pesquisa diferente' : 'Este paciente ainda não possui análises realizadas. Clique em "Nova Análise" para começar.'}
          </Text>
        </View>
      )}

      {/* New Analysis Button */}
      <View style={styles.newAnalysisContainer}>
        <TouchableOpacity 
          style={styles.newAnalysisButton}
          onPress={navigateToNewAnalysis}
        >
          <Text style={styles.newAnalysisText}>Nova Análise</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    marginBottom: 16,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3E8D1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E7FF',
    borderRadius: 12,
    padding: 16,
    margin: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    color: '#6366F1',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 160,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  conditionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    padding: 16,
    marginBottom: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conditionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  conditionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  newAnalysisContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
  },
  newAnalysisButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  newAnalysisText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PatientConditionsScreen;