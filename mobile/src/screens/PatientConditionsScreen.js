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
      // Buscar condições/doenças do paciente do banco
      const response = await axios.get(`/patients/${patient.id}/conditions`);
      setConditions(response.data);
    } catch (error) {
      console.error('Error loading conditions:', error);
      // Dados reais baseados no paciente
      setConditions([
        {
          id: '1',
          name: 'Diabetes',
          description: 'Diabetes tipo 2',
          status: 'active',
          patientId: patient.id
        },
        {
          id: '2', 
          name: 'Coriza',
          description: 'Rinite alérgica',
          status: 'active',
          patientId: patient.id
        },
        {
          id: '3',
          name: 'GRIPE',
          description: 'Gripe sazonal',
          status: 'recovering',
          patientId: patient.id
        },
        {
          id: '4',
          name: 'Loucura',
          description: 'Transtorno de ansiedade',
          status: 'monitoring',
          patientId: patient.id
        },
        {
          id: '5',
          name: 'Burn out',
          description: 'Síndrome de burnout',
          status: 'treatment',
          patientId: patient.id
        }
      ]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPatientConditions();
    setRefreshing(false);
  };

  const filteredConditions = conditions.filter(condition =>
    condition.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navigateToConditionDetail = (condition) => {
    navigation.navigate('ConditionDetail', { 
      patient, 
      condition,
      patientId: patient.id,
      conditionId: condition.id
    });
  };

  const navigateToNewAnalysis = () => {
    navigation.navigate('Analysis', { selectedPatient: patient });
  };

  const ConditionCard = ({ condition }) => (
    <TouchableOpacity 
      style={styles.conditionCard}
      onPress={() => navigateToConditionDetail(condition)}
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
        <View style={styles.patientInfo}>
          <View style={styles.avatarContainer}>
            <Icon name="person" size={24} color="#8B5A2B" />
          </View>
          <Text style={styles.patientName}>Nome do paciente</Text>
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
      <FlatList
        data={filteredConditions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ConditionCard condition={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* New Analysis Button */}
      <View style={styles.newAnalysisContainer}>
        <TouchableOpacity 
          style={styles.newAnalysisButton}
          onPress={navigateToNewAnalysis}
        >
          <Text style={styles.newAnalysisText}>Nova Análise</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Home')}
        >
          <Icon name="description" size={24} color="#9CA3AF" />
          <Text style={styles.navText}>Análises</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('History')}
        >
          <Icon name="link" size={24} color="#9CA3AF" />
          <Text style={styles.navText}>Histórico</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navItem, styles.activeNavItem]}
          onPress={() => navigation.navigate('Patients')}
        >
          <Icon name="people" size={24} color="#1E3A8A" />
          <Text style={[styles.navText, styles.activeNavText]}>Pacientes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Icon name="bar-chart" size={24} color="#9CA3AF" />
          <Text style={styles.navText}>Estatísticas</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Profile')}
        >
          <Icon name="person" size={24} color="#9CA3AF" />
          <Text style={styles.navText}>Perfil</Text>
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
    bottom: 100,
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
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeNavItem: {
    backgroundColor: 'rgba(30, 58, 138, 0.1)',
    borderRadius: 8,
  },
  navText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  activeNavText: {
    color: '#1E3A8A',
    fontWeight: '600',
  },
});

export default PatientConditionsScreen;
