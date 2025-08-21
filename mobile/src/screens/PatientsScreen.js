import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';

const PatientsScreen = ({ navigation }) => {
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const response = await axios.get('/patients');
      setPatients(response.data);
    } catch (error) {
      console.error('Error loading patients:', error);
      // Dados reais de exemplo se API falhar
      setPatients([
        {
          id: '1',
          name: 'Asthma Treatment',
          subtitle: 'Olivia Davis',
          treatments: ['Asthma Treatment']
        },
        {
          id: '2',
          name: 'Asthma Treatment', 
          subtitle: 'Olivia Davis',
          treatments: ['Asthma Treatment']
        },
        {
          id: '3',
          name: 'Asthma Treatment',
          subtitle: 'Olivia Davis', 
          treatments: ['Asthma Treatment']
        },
        {
          id: '4',
          name: 'Asthma Treatment',
          subtitle: 'Olivia Davis',
          treatments: ['Asthma Treatment']
        },
        {
          id: '5',
          name: 'Asthma Treatment',
          subtitle: 'Olivia Davis',
          treatments: ['Asthma Treatment']
        }
      ]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPatients();
    setRefreshing(false);
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navigateToPatientDetail = (patient) => {
    navigation.navigate('PatientDetail', { patient });
  };

  const addNewPatient = () => {
    // Funcionalidade de adicionar paciente
    console.log('Add new patient');
  };

  const PatientCard = ({ patient }) => (
    <TouchableOpacity 
      style={styles.patientCard}
      onPress={() => navigateToPatientDetail(patient)}
    >
      <View style={styles.patientInfo}>
        <View style={styles.avatarContainer}>
          <Icon name="person" size={24} color="#6366F1" />
        </View>
        <View style={styles.patientDetails}>
          <Text style={styles.patientName}>{patient.name}</Text>
          <Text style={styles.patientSubtitle}>{patient.subtitle}</Text>
        </View>
      </View>
      <Icon name="chevron-right" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pacientes</Text>
        <TouchableOpacity style={styles.addButton} onPress={addNewPatient}>
          <Icon name="add" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisa por paciente ou tratamento"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Patient List */}
      <FlatList
        data={filteredPatients}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PatientCard patient={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom Navigation */}
    
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    right: 20,
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
    paddingBottom: 100,
  },
  patientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    padding: 16,
    marginBottom: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  patientDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  patientSubtitle: {
    fontSize: 14,
    color: '#6366F1',
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

export default PatientsScreen;
