import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, CheckBox
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';

const PatientDetailScreen = ({ route, navigation }) => {
  const { patient, patientId } = route.params;
  const [patientData, setPatientData] = useState(patient);
  const [checklist, setChecklist] = useState({
    medication: false,
    physiotherapy: false,
    vitals: false
  });

  useEffect(() => {
    if (patientId && !patient) {
      loadPatientData();
    }
  }, [patientId]);

  const loadPatientData = async () => {
    try {
      const response = await axios.get(`/patients/${patientId}`);
      setPatientData(response.data);
    } catch (error) {
      console.error('Error loading patient:', error);
    }
  };

  const toggleChecklistItem = (item) => {
    setChecklist(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const mockEvolutionImages = [
    { id: 1, date: '22/07/2024', type: 'CT' },
    { id: 2, date: '23/07/2024', type: 'MRI' },
    { id: 3, date: '24/07/2024', type: 'X-Ray' }
  ];

  const mockDiseases = [
    'Diabetes', 'Coriza', 'GRIPE', 'Loucura', 'Burn out'
  ];

  const mockAnalysisResults = [
    {
      id: 1,
      category: 'Diagnóstico principal',
      result: 'Diabetes ver mais sobre a doença',
      date: '22/07/2024',
      completed: true
    },
    {
      id: 2,
      category: 'Fisiopatologia', 
      result: 'Continuar com a medicação e fisioterapia, monitorando a evolução.',
      date: '22/07/2024',
      completed: true
    },
    {
      id: 3,
      category: 'Diagnósticos Diferenciais',
      result: 'Continuar com a medicação e fisioterapia, monitorando a evolução.',
      date: '22/07/2024',
      completed: true
    },
    {
      id: 4,
      category: 'Guia de Prescrição',
      result: 'Continuar com a medicação e fisioterapia, monitorando a evolução.',
      date: '22/07/2024',
      completed: true
    },
    {
      id: 5,
      category: 'Etiologia',
      result: 'Continuar com a medicação e fisioterapia, monitorando a evolução.',
      date: '22/07/2024',
      completed: true
    },
    {
      id: 6,
      category: 'Abordagem diagnóstica',
      result: 'Continuar com a medicação e fisioterapia, monitorando a evolução.',
      date: '22/07/2024',
      completed: true
    },
    {
      id: 7,
      category: 'Abordagem Terapêutica',
      result: 'Continuar com a medicação e fisioterapia, monitorando a evolução.',
      date: '22/07/2024',
      completed: true
    },
    {
      id: 8,
      category: 'Apresentação Clínica',
      result: 'Continuar com a medicação e fisioterapia, monitorando a evolução.',
      date: '22/07/2024',
      completed: true
    }
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Diário de Evolução</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Patient Info */}
        <View style={styles.patientInfoContainer}>
          <View style={styles.patientAvatar}>
            <Icon name="person" size={32} color="#8B5A2B" />
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>Dr. Lucas Mendes</Text>
            <Text style={styles.patientAge}>32 anos</Text>
            <Text style={styles.patientType}>Paciente</Text>
          </View>
        </View>

        {/* Evolution Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Imagens de Evolução</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
            {mockEvolutionImages.map((image) => (
              <View key={image.id} style={styles.evolutionImageContainer}>
                <View style={styles.evolutionImage}>
                  <Icon name="medical-services" size={32} color="#10B981" />
                </View>
                <Text style={styles.imageDate}>{image.date}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Patient Annotations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Anotações do Paciente</Text>
          <View style={styles.annotationContainer}>
            <Text style={styles.annotationTitle}>Paciente</Text>
            <Text style={styles.annotationText}>
              Estou me sentindo melhor hoje, com menos dor e mais energia. A fisioterapia está ajudando bastante.
            </Text>
            <Text style={styles.annotationDate}>22/07/2024</Text>
          </View>
        </View>

        {/* Disease List */}
        <View style={styles.section}>
          <View style={styles.diseasesHeader}>
            <Icon name="description" size={24} color="#6B7280" />
            <Text style={styles.sectionTitle}>Nome do paciente</Text>
          </View>
          
          {mockDiseases.map((disease, index) => (
            <TouchableOpacity key={index} style={styles.diseaseItem}>
              <Icon name="description" size={20} color="#6B7280" />
              <Text style={styles.diseaseText}>{disease}</Text>
              <Icon name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Checklist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Checklist Diário do paciente</Text>
          
          <View style={styles.checklistContainer}>
            <TouchableOpacity 
              style={styles.checklistItem}
              onPress={() => toggleChecklistItem('medication')}
            >
              <View style={[styles.checkbox, checklist.medication && styles.checkboxChecked]}>
                {checklist.medication && <Icon name="check" size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.checklistText}>Tomar medicação prescrita (22/07/2024)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.checklistItem}
              onPress={() => toggleChecklistItem('physiotherapy')}
            >
              <View style={[styles.checkbox, checklist.physiotherapy && styles.checkboxChecked]}>
                {checklist.physiotherapy && <Icon name="check" size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.checklistText}>Realizar exercícios de fisioterapia (22/07/2024)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.checklistItem}
              onPress={() => toggleChecklistItem('vitals')}
            >
              <View style={[styles.checkbox, checklist.vitals && styles.checkboxChecked]}>
                {checklist.vitals && <Icon name="check" size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.checklistText}>Monitorar sinais vitais (22/07/2024)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Analysis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Análise de IA</Text>
          
          <View style={styles.aiResponseContainer}>
            <Text style={styles.aiResponseTitle}>Resposta da IA</Text>
            <Text style={styles.aiResponseText}>
              Acredito que possa ser tal doença e etc
            </Text>
          </View>

          {/* Analysis Results */}
          {mockAnalysisResults.map((result) => (
            <View key={result.id} style={styles.analysisResultCard}>
              <View style={styles.analysisResultHeader}>
                <Text style={styles.analysisResultCategory}>{result.category}</Text>
                {result.completed && (
                  <Icon name="check-circle" size={16} color="#10B981" />
                )}
              </View>
              <Text style={styles.analysisResultText} numberOfLines={2}>
                {result.result}
              </Text>
              <Text style={styles.analysisResultDate}>{result.date}</Text>
            </View>
          ))}
        </View>

        {/* Finalize Button */}
        <TouchableOpacity style={styles.finalizeButton}>
          <Text style={styles.finalizeButtonText}>Finalizar Caso Clínico</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Home')}
        >
          <Icon name="description" size={24} color="#9CA3AF" />
          <Text style={styles.navText}>Análises</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  patientInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  patientAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3E8D1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  patientAge: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  patientType: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  imagesContainer: {
    flexDirection: 'row',
  },
  evolutionImageContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  evolutionImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  imageDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  annotationContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
  },
  annotationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  annotationText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  annotationDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  diseasesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  diseaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  diseaseText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
  checklistContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checklistText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  aiResponseContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  aiResponseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  aiResponseText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  analysisResultCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  analysisResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  analysisResultCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  analysisResultText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  analysisResultDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  finalizeButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  finalizeButtonText: {
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

export default PatientDetailScreen;
