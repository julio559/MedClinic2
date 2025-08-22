import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

const PatientsScreen = ({ navigation }) => {
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [modalAnim] = useState(new Animated.Value(0));
  const [filterType, setFilterType] = useState('all'); // all, active, recent
  
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

  const loadPatients = async () => {
    try {
      const response = await axios.get('/patients');
      setPatients(response.data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
      // Mock data para demonstração
      setPatients([
        {
          id: '1',
          name: 'Maria Silva Santos',
          email: 'maria.silva@email.com',
          phone: '(11) 99999-9999',
          birthDate: '1985-03-15',
          gender: 'F',
          status: 'active',
          lastVisit: new Date().toISOString(),
          analysesCount: 5,
          priority: 'medium'
        },
        {
          id: '2',
          name: 'João Carlos Oliveira',
          email: 'joao.oliveira@email.com',
          phone: '(11) 88888-8888',
          birthDate: '1978-08-22',
          gender: 'M',
          status: 'active',
          lastVisit: new Date(Date.now() - 86400000).toISOString(),
          analysesCount: 8,
          priority: 'high'
        },
        {
          id: '3',
          name: 'Ana Carolina Ferreira',
          email: 'ana.ferreira@email.com',
          phone: '(11) 77777-7777',
          birthDate: '1992-12-10',
          gender: 'F',
          status: 'inactive',
          lastVisit: new Date(Date.now() - 7776000000).toISOString(), // 3 months ago
          analysesCount: 2,
          priority: 'low'
        },
        {
          id: '4',
          name: 'Roberto Mendes Costa',
          email: null,
          phone: '(11) 66666-6666',
          birthDate: '1965-07-03',
          gender: 'M',
          status: 'active',
          lastVisit: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
          analysesCount: 12,
          priority: 'high'
        }
      ]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPatients();
    setRefreshing(false);
  };

  const getFilteredPatients = () => {
    let filtered = patients.filter(patient =>
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (patient.email && patient.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Aplicar filtro por tipo
    switch (filterType) {
      case 'active':
        filtered = filtered.filter(p => p.status === 'active');
        break;
      case 'recent':
        const oneWeekAgo = new Date(Date.now() - 604800000);
        filtered = filtered.filter(p => new Date(p.lastVisit) > oneWeekAgo);
        break;
      default:
        break;
    }

    // Ordenar por prioridade e última visita
    return filtered.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 1;
      const bPriority = priorityOrder[b.priority] || 1;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return new Date(b.lastVisit) - new Date(a.lastVisit);
    });
  };

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
    
    // Animação do modal
    Animated.spring(modalAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
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
    });
  };

  // Funções de formatação
  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else {
      return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }
  };

  const formatDate = (value) => {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return numbers.replace(/(\d{2})(\d{0,2})/, '$1/$2');
    } else {
      return numbers.replace(/(\d{2})(\d{2})(\d{0,4})/, '$1/$2/$3');
    }
  };

  const formatLastVisit = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      
      if (diffInDays === 0) return 'Hoje';
      if (diffInDays === 1) return 'Ontem';
      if (diffInDays < 7) return `${diffInDays} dias atrás`;
      if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} semanas atrás`;
      if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} meses atrás`;
      return `${Math.floor(diffInDays / 365)} anos atrás`;
    } catch {
      return 'Data inválida';
    }
  };

  const getPatientAge = (birthDate) => {
    try {
      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      return `${age} anos`;
    } catch {
      return 'Idade não informada';
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
      errors.push('Email deve ter um formato válido');
    }
    
    if (newPatient.phone && newPatient.phone.replace(/\D/g, '').length < 10) {
      errors.push('Telefone deve ter pelo menos 10 dígitos');
    }
    
    if (newPatient.birthDate && !validateDate(newPatient.birthDate)) {
      errors.push('Data de nascimento inválida');
    }

    if (errors.length > 0) {
      Alert.alert('Erro no formulário', errors.join('\n\n'));
      return false;
    }
    
    return true;
  };

  const handleInputChange = (field, value) => {
    let formattedValue = value;
    
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
      
      Object.keys(patientData).forEach(key => {
        if (patientData[key] === '') {
          patientData[key] = null;
        }
      });
      
      // Adicionar campos extras para o mock
      patientData.status = 'active';
      patientData.lastVisit = new Date().toISOString();
      patientData.analysesCount = 0;
      patientData.priority = 'medium';
      patientData.id = Date.now().toString();
      
      const response = await axios.post('/patients', patientData).catch(() => ({ data: patientData }));
      
      setPatients(prev => [response.data, ...prev]);
      
      Alert.alert('Sucesso', 'Paciente criado com sucesso!');
      closeModal();
    } catch (error) {
      console.error('Error creating patient:', error);
      Alert.alert('Erro', 'Erro ao criar paciente');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'active':
        return { color: '#10B981', bg: '#ECFDF5', text: 'Ativo' };
      case 'inactive':
        return { color: '#6B7280', bg: '#F9FAFB', text: 'Inativo' };
      default:
        return { color: '#F59E0B', bg: '#FFFBEB', text: 'Pendente' };
    }
  };

  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'high':
        return { color: '#EF4444', text: 'Alta' };
      case 'medium':
        return { color: '#F59E0B', text: 'Média' };
      case 'low':
        return { color: '#10B981', text: 'Baixa' };
      default:
        return { color: '#6B7280', text: 'Normal' };
    }
  };

  const PatientCard = ({ patient, index }) => {
    const statusConfig = getStatusConfig(patient.status);
    const priorityConfig = getPriorityConfig(patient.priority);
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
        styles.patientCardContainer,
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
          style={styles.patientCard}
          onPress={() => navigateToPatientConditions(patient)}
          activeOpacity={0.7}
        >
          {/* Priority Strip */}
          <View style={[styles.priorityStrip, { backgroundColor: priorityConfig.color }]} />
          
          {/* Card Content */}
          <View style={styles.cardContent}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.patientAvatar}>
                  <Text style={styles.patientInitial}>
                    {patient.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                
                <View style={styles.patientMainInfo}>
                  <Text style={styles.patientName} numberOfLines={1}>
                    {patient.name}
                  </Text>
                  <Text style={styles.patientAge}>
                    {patient.birthDate ? getPatientAge(patient.birthDate) : 'Idade não informada'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.cardHeaderRight}>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                  <Text style={[styles.statusText, { color: statusConfig.color }]}>
                    {statusConfig.text}
                  </Text>
                </View>
                <Icon name="chevron-right" size={20} color="#9CA3AF" />
              </View>
            </View>

            {/* Contact Info */}
            <View style={styles.contactInfo}>
              <View style={styles.contactItem}>
                <Icon name="email" size={16} color="#6B7280" />
                <Text style={styles.contactText}>
                  {patient.email || 'Email não informado'}
                </Text>
              </View>
              {patient.phone && (
                <View style={styles.contactItem}>
                  <Icon name="phone" size={16} color="#6B7280" />
                  <Text style={styles.contactText}>{patient.phone}</Text>
                </View>
              )}
            </View>

            {/* Stats Footer */}
            <View style={styles.cardFooter}>
              <View style={styles.cardStats}>
                <View style={styles.statItem}>
                  <Icon name="analytics" size={16} color="#3B82F6" />
                  <Text style={styles.statText}>{patient.analysesCount} análises</Text>
                </View>
                
                <View style={styles.statDivider} />
                
                <View style={styles.statItem}>
                  <Icon name="schedule" size={16} color="#6B7280" />
                  <Text style={styles.statText}>{formatLastVisit(patient.lastVisit)}</Text>
                </View>
              </View>
              
              <View style={[styles.priorityDot, { backgroundColor: priorityConfig.color }]} />
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const filteredPatients = getFilteredPatients();
  const activePatients = patients.filter(p => p.status === 'active').length;
  const totalAnalyses = patients.reduce((sum, p) => sum + (p.analysesCount || 0), 0);

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
              <Text style={styles.headerTitleText}>Pacientes</Text>
              <Text style={styles.headerSubtitle}>
                {activePatients} ativo{activePatients !== 1 ? 's' : ''} • {totalAnalyses} análises
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.addPatientButton}
              onPress={openAddPatientModal}
            >
              <Icon name="person-add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      {/* Search and Filters */}
      <Animated.View style={[
        styles.searchSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nome ou email..."
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

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabs}>
          {[
            { key: 'all', label: 'Todos', count: patients.length },
            { key: 'active', label: 'Ativos', count: patients.filter(p => p.status === 'active').length },
            { key: 'recent', label: 'Recentes', count: patients.filter(p => {
              const oneWeekAgo = new Date(Date.now() - 604800000);
              return new Date(p.lastVisit) > oneWeekAgo;
            }).length }
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                filterType === filter.key && styles.filterTabActive
              ]}
              onPress={() => setFilterType(filter.key)}
            >
              <Text style={[
                styles.filterTabText,
                filterType === filter.key && styles.filterTabTextActive
              ]}>
                {filter.label} ({filter.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Patient List */}
      {filteredPatients.length > 0 ? (
        <FlatList
          data={filteredPatients}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <PatientCard patient={item} index={index} />}
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
            <Icon name="people" size={80} color="#E2E8F0" />
          </View>
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'Nenhum paciente encontrado' : 'Sem pacientes cadastrados'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery 
              ? 'Tente ajustar os termos da sua busca' 
              : 'Comece adicionando seus primeiros pacientes ao sistema'
            }
          </Text>
          {!searchQuery && (
            <TouchableOpacity style={styles.emptyButton} onPress={openAddPatientModal}>
              <Icon name="person-add" size={20} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Adicionar Primeiro Paciente</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* Add Patient Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[
            styles.modalContainer,
            {
              opacity: modalAnim,
              transform: [{
                translateY: modalAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [height, 0]
                })
              }]
            }
          ]}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalKeyboard}
            >
              <View style={styles.modalContent}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={closeModal} style={styles.modalCloseButton}>
                    <Icon name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Novo Paciente</Text>
                  <View style={styles.modalHeaderSpacer} />
                </View>

                <ScrollView 
                  style={styles.modalBody} 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.modalBodyContent}
                >
                  {/* Form Fields */}
                  <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Informações Básicas</Text>
                    
                    {/* Nome */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        Nome Completo <Text style={styles.requiredText}>*</Text>
                      </Text>
                      <View style={styles.inputContainer}>
                        <Icon name="person" size={20} color="#9CA3AF" />
                        <TextInput
                          style={styles.input}
                          placeholder="Digite o nome completo"
                          placeholderTextColor="#9CA3AF"
                          value={newPatient.name}
                          onChangeText={(value) => handleInputChange('name', value)}
                        />
                      </View>
                    </View>

                    {/* Email */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Email</Text>
                      <View style={styles.inputContainer}>
                        <Icon name="email" size={20} color="#9CA3AF" />
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
                    </View>

                    {/* Telefone */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Telefone</Text>
                      <View style={styles.inputContainer}>
                        <Icon name="phone" size={20} color="#9CA3AF" />
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
                    </View>

                    {/* Data de Nascimento */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Data de Nascimento</Text>
                      <View style={styles.inputContainer}>
                        <Icon name="cake" size={20} color="#9CA3AF" />
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
                    </View>
                  </View>

                  {/* Gender Section */}
                  <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Gênero</Text>
                    <View style={styles.genderContainer}>
                      {[
                        { value: 'M', label: 'Masculino', icon: 'man' },
                        { value: 'F', label: 'Feminino', icon: 'woman' },
                        { value: 'Other', label: 'Outro', icon: 'person' }
                      ].map((gender) => (
                        <TouchableOpacity
                          key={gender.value}
                          style={[
                            styles.genderOption,
                            newPatient.gender === gender.value && styles.genderOptionSelected
                          ]}
                          onPress={() => handleInputChange('gender', gender.value)}
                        >
                          <Icon 
                            name={gender.icon} 
                            size={24} 
                            color={newPatient.gender === gender.value ? '#667EEA' : '#9CA3AF'} 
                          />
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

                  {/* Additional Info */}
                  <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Informações Adicionais</Text>
                    
                    {/* Endereço */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Endereço</Text>
                      <View style={[styles.inputContainer, styles.textAreaContainer]}>
                        <Icon name="location-on" size={20} color="#9CA3AF" style={styles.textAreaIcon} />
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
                    </View>

                    {/* Histórico Médico */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Histórico Médico</Text>
                      <View style={[styles.inputContainer, styles.textAreaContainer]}>
                        <Icon name="medical-services" size={20} color="#9CA3AF" style={styles.textAreaIcon} />
                        <TextInput
                          style={[styles.input, styles.textArea]}
                          placeholder="Doenças anteriores, cirurgias, medicações..."
                          placeholderTextColor="#9CA3AF"
                          value={newPatient.medicalHistory}
                          onChangeText={(value) => handleInputChange('medicalHistory', value)}
                          multiline
                          numberOfLines={4}
                        />
                      </View>
                    </View>

                    {/* Alergias */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Alergias</Text>
                      <View style={[styles.inputContainer, styles.textAreaContainer]}>
                        <Icon name="warning" size={20} color="#9CA3AF" style={styles.textAreaIcon} />
                        <TextInput
                          style={[styles.input, styles.textArea]}
                          placeholder="Alergias a medicamentos, alimentos..."
                          placeholderTextColor="#9CA3AF"
                          value={newPatient.allergies}
                          onChangeText={(value) => handleInputChange('allergies', value)}
                          multiline
                          numberOfLines={3}
                        />
                      </View>
                    </View>
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
                    <View style={styles.createButtonGradient} />
                    <View style={styles.createButtonContent}>
                      {loading ? (
                        <Icon name="hourglass-bottom" size={20} color="#FFFFFF" />
                      ) : (
                        <Icon name="person-add" size={20} color="#FFFFFF" />
                      )}
                      <Text style={styles.createButtonText}>
                        {loading ? 'Criando...' : 'Criar Paciente'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

export default PatientsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Header Premium
  headerContainer: {
    height: 140,
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
    justifyContent: 'center',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  addPatientButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search and Filters
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
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
  filterTabs: {
    flexDirection: 'row',
  },
  filterTab: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterTabActive: {
    backgroundColor: '#667EEA',
    borderColor: '#667EEA',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },

  // List
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Patient Cards
  patientCardContainer: {
    marginBottom: 12,
  },
  patientCard: {
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
  priorityStrip: {
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
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#667EEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  patientMainInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
    lineHeight: 20,
  },
  patientAge: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  cardHeaderRight: {
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
  contactInfo: {
    gap: 8,
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#E5E7EB',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalKeyboard: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    borderBottomColor: '#F1F5F9',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },
  modalHeaderSpacer: {
    width: 40,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Form Sections
  formSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  requiredText: {
    color: '#EF4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 16,
  },
  textAreaIcon: {
    marginTop: 2,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Gender Selection
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderOption: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  genderOptionSelected: {
    borderColor: '#667EEA',
    backgroundColor: '#EFF6FF',
  },
  genderText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  genderTextSelected: {
    color: '#667EEA',
  },

  // Modal Footer
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
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
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
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
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#667EEA',
    background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
  },
  createButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});