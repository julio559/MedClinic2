import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';

const PatientsScreen = ({ navigation }) => {
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [newPatient, setNewPatient] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    gender: '',
    address: '',
    medicalHistory: '',
    allergies: ''
  });

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const response = await axios.get('/patients');
      setPatients(response.data);
    } catch (error) {
      console.error('Error loading patients:', error);
      setPatients([]); // Lista vazia se erro na API
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPatients();
    setRefreshing(false);
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navigateToPatientConditions = (patient) => {
    navigation.navigate('PatientConditions', { patient });
  };

  const openAddPatientModal = () => {
    setNewPatient({
      name: '',
      email: '',
      phone: '',
      birthDate: '',
      gender: '',
      address: '',
      medicalHistory: '',
      allergies: ''
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setNewPatient({
      name: '',
      email: '',
      phone: '',
      birthDate: '',
      gender: '',
      address: '',
      medicalHistory: '',
      allergies: ''
    });
  };

  // Funções de formatação
  const formatPhone = (value) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara (00) 00000-0000
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else {
      return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }
  };

  const formatDate = (value) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara DD/MM/AAAA
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return numbers.replace(/(\d{2})(\d{0,2})/, '$1/$2');
    } else {
      return numbers.replace(/(\d{2})(\d{2})(\d{0,4})/, '$1/$2/$3');
    }
  };

  const validateDate = (dateString) => {
    if (!dateString) return null;
    
    const [day, month, year] = dateString.split('/');
    if (!day || !month || !year || year.length !== 4) {
      return null;
    }
    
    const date = new Date(year, month - 1, day);
    if (date.getDate() != day || date.getMonth() != month - 1 || date.getFullYear() != year) {
      return null;
    }
    
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const validateForm = () => {
    const errors = [];

    if (!newPatient.name.trim()) {
      errors.push('Nome é obrigatório');
    }
    
    if (newPatient.email && !newPatient.email.includes('@')) {
      errors.push('Email deve ter um formato válido (exemplo@dominio.com)');
    }
    
    if (newPatient.phone && newPatient.phone.replace(/\D/g, '').length < 10) {
      errors.push('Telefone deve ter pelo menos 10 dígitos');
    }
    
    if (newPatient.birthDate && !validateDate(newPatient.birthDate)) {
      errors.push('Data de nascimento deve estar no formato DD/MM/AAAA e ser uma data válida');
    }

    if (errors.length > 0) {
      Alert.alert('Erro no formulário', errors.join('\n\n'));
      return false;
    }
    
    return true;
  };

  const handleInputChange = (field, value) => {
    let formattedValue = value;
    
    // Aplicar formatação específica por campo
    if (field === 'phone') {
      formattedValue = formatPhone(value);
    } else if (field === 'birthDate') {
      formattedValue = formatDate(value);
    }
    
    setNewPatient(prev => ({
      ...prev,
      [field]: formattedValue
    }));
  };

  const createPatient = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const patientData = { ...newPatient };
      
      // Converter data para formato ISO se fornecida
      if (patientData.birthDate) {
        const isoDate = validateDate(patientData.birthDate);
        if (isoDate) {
          patientData.birthDate = isoDate;
        } else {
          patientData.birthDate = null;
        }
      } else {
        patientData.birthDate = null;
      }
      
      // Limpar campos vazios
      Object.keys(patientData).forEach(key => {
        if (patientData[key] === '') {
          patientData[key] = null;
        }
      });
      
      const response = await axios.post('/patients', patientData);
      
      // Adicionar novo paciente à lista
      setPatients(prev => [response.data, ...prev]);
      
      Alert.alert('Sucesso', 'Paciente criado com sucesso!');
      closeModal();
    } catch (error) {
      console.error('Error creating patient:', error);
      let errorMessage = 'Erro ao criar paciente';
      
      if (error.response?.data?.error) {
        const apiError = error.response.data.error;
        
        // Traduzir erros específicos
        if (apiError.includes('Incorrect date value')) {
          errorMessage = 'Data de nascimento inválida. Use o formato DD/MM/AAAA';
        } else if (apiError.includes('Duplicate entry') && apiError.includes('email')) {
          errorMessage = 'Este email já está cadastrado para outro paciente';
        } else if (apiError.includes('email')) {
          errorMessage = 'Email inválido';
        } else if (apiError.includes('phone')) {
          errorMessage = 'Telefone inválido';
        } else {
          errorMessage = apiError;
        }
      }
      
      Alert.alert('Erro', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const PatientCard = ({ patient }) => (
    <TouchableOpacity 
      style={styles.patientCard}
      onPress={() => navigateToPatientConditions(patient)}
    >
      <View style={styles.patientInfo}>
        <View style={styles.avatarContainer}>
          <Icon name="person" size={24} color="#6366F1" />
        </View>
        <View style={styles.patientDetails}>
          <Text style={styles.patientName}>{patient.name}</Text>
          <Text style={styles.patientSubtitle}>{patient.email || 'Email não informado'}</Text>
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
        <TouchableOpacity style={styles.addButton} onPress={openAddPatientModal}>
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
      {filteredPatients.length > 0 ? (
        <FlatList
          data={filteredPatients}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PatientCard patient={item} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="people" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Nenhum paciente encontrado</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery ? 'Tente uma pesquisa diferente' : 'Você ainda não possui pacientes cadastrados'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity style={styles.emptyActionButton} onPress={openAddPatientModal}>
              <Icon name="add" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.emptyActionText}>Adicionar Primeiro Paciente</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Add Patient Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={closeModal}>
                  <Icon name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Novo Paciente</Text>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Nome */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nome Completo *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Digite o nome completo"
                    placeholderTextColor="#9CA3AF"
                    value={newPatient.name}
                    onChangeText={(value) => handleInputChange('name', value)}
                  />
                </View>

                {/* Email */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email <Text style={styles.optionalText}>(opcional)</Text></Text>
                  <TextInput
                    style={styles.input}
                    placeholder="exemplo@email.com"
                    placeholderTextColor="#9CA3AF"
                    value={newPatient.email}
                    onChangeText={(value) => handleInputChange('email', value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                {/* Telefone */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Telefone <Text style={styles.optionalText}>(opcional)</Text></Text>
                  <TextInput
                    style={styles.input}
                    placeholder="(00) 00000-0000"
                    placeholderTextColor="#9CA3AF"
                    value={newPatient.phone}
                    onChangeText={(value) => handleInputChange('phone', value)}
                    keyboardType="phone-pad"
                    maxLength={15}
                  />
                </View>

                {/* Data de Nascimento */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Data de Nascimento <Text style={styles.optionalText}>(opcional)</Text></Text>
                  <TextInput
                    style={styles.input}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor="#9CA3AF"
                    value={newPatient.birthDate}
                    onChangeText={(value) => handleInputChange('birthDate', value)}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>

                {/* Gênero */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Gênero <Text style={styles.optionalText}>(opcional)</Text></Text>
                  <View style={styles.genderContainer}>
                    {[
                      { value: 'M', label: 'Masculino' },
                      { value: 'F', label: 'Feminino' },
                      { value: 'Other', label: 'Outro' }
                    ].map((gender) => (
                      <TouchableOpacity
                        key={gender.value}
                        style={[
                          styles.genderOption,
                          newPatient.gender === gender.value && styles.genderOptionSelected
                        ]}
                        onPress={() => handleInputChange('gender', gender.value)}
                      >
                        <Text style={[
                          styles.genderText,
                          newPatient.gender === gender.value && styles.genderTextSelected
                        ]}>
                          {gender.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Endereço */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Endereço <Text style={styles.optionalText}>(opcional)</Text></Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Endereço completo"
                    placeholderTextColor="#9CA3AF"
                    value={newPatient.address}
                    onChangeText={(value) => handleInputChange('address', value)}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* Histórico Médico */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Histórico Médico <Text style={styles.optionalText}>(opcional)</Text></Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Doenças anteriores, cirurgias, medicações em uso..."
                    placeholderTextColor="#9CA3AF"
                    value={newPatient.medicalHistory}
                    onChangeText={(value) => handleInputChange('medicalHistory', value)}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                {/* Alergias */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Alergias <Text style={styles.optionalText}>(opcional)</Text></Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Alergias a medicamentos, alimentos, outros..."
                    placeholderTextColor="#9CA3AF"
                    value={newPatient.allergies}
                    onChangeText={(value) => handleInputChange('allergies', value)}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={{ height: 100 }} />
              </ScrollView>

              {/* Modal Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={closeModal}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.createButton, loading && styles.createButtonDisabled]} 
                  onPress={createPatient}
                  disabled={loading}
                >
                  <Text style={styles.createButtonText}>
                    {loading ? 'Criando...' : 'Criar Paciente'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  emptyActionButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  optionalText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  genderOptionSelected: {
    borderColor: '#1E3A8A',
    backgroundColor: '#EBF4FF',
  },
  genderText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  genderTextSelected: {
    color: '#1E3A8A',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  createButton: {
    flex: 1,
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  createButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default PatientsScreen;